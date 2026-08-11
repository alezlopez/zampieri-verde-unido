import { corsHeaders } from "../_shared/cors.ts";

/**
 * Diagnóstico + manutenção dos templates do WhatsApp.
 *
 * GET  -> lista templates (nome, status, categoria) e a saúde do número.
 * POST { acao: "criar_utility" } -> cria versões UTILITY dos templates
 * transacionais (mensagens MARKETING não são entregues a quem optou por
 * não receber promoções; UTILITY sempre é entregue).
 */

const SITE = "https://colegiozampieri.com.br";

type Novo = {
  name: string;
  body: string;
  exemplos: string[];
  botao?: { texto: string; base: string };
};

const NOVOS: Novo[] = [
  {
    name: "prematricula_recebida_u",
    body:
      "Olá, {{1}}! Recebemos a pré-matrícula de {{2}}. Protocolo {{3}}.\n\nNossa equipe vai conferir os dados e você receberá um retorno em breve para agendar a Entrevista Familiar.",
    exemplos: ["Ana", "João Silva", "A1B2C3D4"],
  },
  {
    name: "prematricula_aprovada_u",
    body:
      "Olá, {{1}}! A pré-matrícula de {{2}} foi aprovada.\n\nO próximo passo é escolher o melhor horário para a Entrevista Familiar no link abaixo.",
    exemplos: ["Ana", "João Silva"],
    botao: { texto: "Escolher horário", base: `${SITE}/prematricula/agendar` },
  },
  {
    name: "prematricula_agendada_u",
    body:
      "Olá, {{1}}! A Entrevista Familiar de {{2}} está confirmada para {{3}}.\n\nSe precisar remarcar, é só falar com a nossa equipe.",
    exemplos: ["Ana", "João Silva", "12/08/2026 às 10h"],
  },
  {
    name: "prematricula_reprovada_u",
    body:
      "Olá, {{1}}. Não foi possível seguir com a pré-matrícula de {{2}} neste momento.\n\nSe acredita que houve algum engano, fale com a nossa equipe.",
    exemplos: ["Ana", "João Silva"],
  },
  {
    name: "matricula_documentos_reenvio_u",
    body:
      "Olá, {{1}}! Precisamos que você reenvie alguns documentos da matrícula de {{2}}: {{3}}.\n\nAcesse o link abaixo para reenviar.",
    exemplos: ["Ana", "João Silva", "RG do responsável, comprovante de endereço"],
    botao: { texto: "Reenviar documentos", base: `${SITE}/matricula` },
  },
  {
    name: "matricula_dados_liberados_u",
    body:
      "Olá, {{1}}! A documentação de {{2}} foi aprovada e o preenchimento dos dados do contrato já está liberado.\n\nAcesse o link abaixo para continuar.",
    exemplos: ["Ana", "João Silva"],
    botao: { texto: "Continuar matrícula", base: `${SITE}/matricula` },
  },
];

const graph = (path: string, token: string, init?: RequestInit) =>
  fetch(`https://graph.facebook.com/v23.0/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("WHATSAPP_TOKEN")!;
  const waba = Deno.env.get("WHATSAPP_WABA_ID")!;
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
  const out: Record<string, unknown> = { waba, phoneId, temToken: !!token };

  const listaRes = await graph(
    `${waba}/message_templates?limit=200&fields=id,name,language,status,category`,
    token,
  );
  const lista = await listaRes.json();
  const templates: any[] = lista?.data ?? [];
  out.templatesErro = lista?.error ?? null;
  out.templates = templates.map((t) => ({
    name: t.name,
    lang: t.language,
    status: t.status,
    category: t.category,
  }));

  const numRes = await graph(
    `${phoneId}?fields=display_phone_number,quality_rating,messaging_limit_tier,name_status,status`,
    token,
  );
  out.numero = await numRes.json();

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body?.acao === "criar_utility") {
      const resultados: unknown[] = [];
      for (const n of NOVOS) {
        if (templates.some((t) => t.name === n.name)) {
          resultados.push({ name: n.name, ja_existe: true });
          continue;
        }
        const components: unknown[] = [
          { type: "BODY", text: n.body, example: { body_text: [n.exemplos] } },
        ];
        if (n.botao) {
          components.push({
            type: "BUTTONS",
            buttons: [
              {
                type: "URL",
                text: n.botao.texto,
                url: `${n.botao.base}{{1}}`,
                example: [`${n.botao.base}?t=exemplo123`],
              },
            ],
          });
        }
        const r = await graph(`${waba}/message_templates`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: n.name,
            language: "pt_BR",
            category: "UTILITY",
            components,
          }),
        });
        const j = await r.json();
        resultados.push({ name: n.name, status: r.status, resposta: j });
        console.log(`Criar ${n.name} status=${r.status} ${JSON.stringify(j)}`);
      }
      out.criacao = resultados;
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
