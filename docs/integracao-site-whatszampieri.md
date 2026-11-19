# Integração site ↔ WhatsZampieri

Documento único do combinado entre os dois sistemas. **A mesma cópia existe nos dois repositórios**
(`alezlopez/zampieri-verde-unido` e `alezlopez/whatszampieri`): ao mudar a integração, atualize as duas.

## Sistemas

| Sistema | Repositório | Supabase | Publicação |
|---|---|---|---|
| Site, pré-matrícula, matrícula, funil de famílias | `zampieri-verde-unido` | `lzdhrtcugqnqmyapgmbs` (n8n_project) | Site: Easypanel publica a `main`. Banco e edge functions: GitHub Actions (`supabase-deploy.yml`) a cada push na `main` |
| WhatsZampieri (atendimento no WhatsApp) | `whatszampieri` | `haizyqhkgkljpnwgbxjq` | Lovable. Push na `main` sincroniza o código, mas **o site só vai ao ar com Publish na Lovable** e **edge functions e migrations só com um pedido na Lovable** ("aplique as migrations pendentes e publique as edge functions X") |

Os dois repositórios são editados só por uma conversa do Claude Code (decisão do Alexandre, nov/2026).
Não editar o WhatsZampieri pelo editor da Lovable, para não haver duas frentes no mesmo código.

## Funil: uma família = um telefone

- A família é identificada pelo telefone, sem o país e sem o 9º dígito: DDD + 8 últimos dígitos
  (`public.chave_telefone` no site; a mesma regra no WhatsZampieri ao procurar contatos).
- **Funil de famílias** (painel do site, `/matricula/leads`, só setor matrícula/direção): uma linha por
  família, de qualquer porta de entrada. Calculado na hora por `public.funil_familias()` a partir de
  `leads_site`, `visitas`, `prematriculas`, `matriculas` e `contatos_whatsapp`. Nada é copiado.
- Etapas do site: interessado → visita (agendada / faltou / realizada) → pré-matrícula enviada →
  aprovada / entrevista → documentos → contrato → matriculado; ou perdido. Família com vários filhos vale
  o mais adiantado ainda ativo. Lista de espera é marcação, não etapa.
- **A origem da família só aparece no painel do site** (direção). Telas de pré-matrícula e matrícula não
  mostram origem.

## Site → WhatsZampieri: `lead_update`

- Gatilhos `whatszampieri_lead_sync` em `prematriculas` e `matriculas` chamam `public.whatszampieri_sync_phone`,
  que calcula a etapa por família e chama `automation-callback` do WhatsZampieri (`action: "lead_update"`,
  header `X-Webhook-Token` = `LEAD_CALLBACK_TOKEN`, no Vault do site como `whatszampieri_lead_token`).
- O site também chama `lead_update` com etapa `qualified` quando alguém preenche o formulário curto ou agenda
  visita (edge function `lead-site`). Contato que nunca escreveu no WhatsApp responde 404 e é ignorado.
- Etapas enviadas: `pre_enrollment`, `visit_scheduled` (entrevista agendada), `interview_done`,
  `enrollment_docs`, `enrolled`, `lost`, `qualified`.
- **Dono do SQL**: o repositório do site (é onde roda), em
  `supabase/migrations/20261119170000_whatszampieri_lead_sync_v2.sql`. Em
  `whatszampieri/integrations/n8n-project/` fica só um apontamento para cá. Reenvio completo: `select public.whatszampieri_resync_all();` no banco do site.

## WhatsZampieri → site: `lead-whatsapp`

- Quando um contato vira **Interessado** no WhatsZampieri (anúncio de clique para WhatsApp, link com
  código `ref`, Comercial no menu de triagem, ou atendente), ou muda de etapa/motivo de perda, o
  WhatsZampieri envia o contato para a edge function `lead-whatsapp` do site:
  `POST https://lzdhrtcugqnqmyapgmbs.supabase.co/functions/v1/lead-whatsapp`,
  header `X-Webhook-Token` = `LEAD_CALLBACK_TOKEN` (o mesmo token), corpo
  `{ phone, name, source, source_detail, contact_id, contact_type, lead_stage, lost_reason, created_at }`
  ou `{ contacts: [...] }` (até 1000, usado no reenvio completo).
- `contact_type` diferente de `lead` (atendente corrigiu para Família, por exemplo) tira a família do funil.
- No WhatsZampieri: o webhook avisa quando o contato vira Interessado (anúncio, link com código, Comercial no
  menu); a barra do contato chama a function `site-sync` quando o atendente marca ou edita um interessado; e a
  página Novos alunos tem o botão "Enviar ao funil do site" (administradores) para o reenvio completo.
- O site grava em `contatos_whatsapp` (uma linha por telefone; a primeira origem é mantida) e a família
  entra no funil como "Conversa no WhatsApp". Se depois agendar visita ou fizer pré-matrícula, a etapa
  avança sozinha (ligação pelo telefone).
- Origem no funil: `ctwa_ad` → "Anúncio Meta (WhatsApp)" com o título do anúncio como campanha;
  `link` → "WhatsApp (link com código)"; `triage`/`manual` → "WhatsApp (conversa)".

## Etiquetas de origem (UTM) e links

| Situação | Link | Etiquetas |
|---|---|---|
| Anúncios do Meta | `/informativomatricula` | `utm_source=meta\|fb\|ig`, `utm_medium=paid`, `utm_campaign=mat27` |
| Bio / posts / stories | `/informativomatricula` | `utm_source=instagram`, `utm_medium=bio\|post\|stories` |
| Secretaria manda visita | `colegiozampieri.com.br/visita` | `utm_source=whatsapp`, `utm_medium=atendimento` (não envia Lead ao Meta) |
| Secretaria manda pré-matrícula | `colegiozampieri.com.br/pre` | `utm_source=whatsapp`, `utm_medium=atendimento` |
| Automações do WhatsZampieri | `pre_enrollment_link` e `visit_link` no webhook das automações | `utm_source=whatsapp`, `utm_medium=automacao` (visita não envia Lead ao Meta) |

Regra do painel: `utm_medium` orgânico (bio, post, stories, social) vale mais que `fbclid`;
`utm_medium` pago (paid, cpc, ads) = anúncio. Mesma regra em `src/lib/canalLead.ts` e
`supabase/functions/_shared/aviso-agenda.ts`.

## Preços 2027: onde estão (mudou um valor, troque em todos)

1. Site: cards por turma e simulador em `src/pages/InformativoMatricula.tsx` (`SEGMENTOS`, `ETAPAS`,
   `MENSALIDADES`, `MATERIAIS`).
2. WhatsZampieri: mensagens rápidas por turma (cadastradas pela equipe em "Respostas rápidas").
3. Renegociação de débitos usa outra regra (`src/lib/renegociacaoDesconto.ts`), não os preços acima.
