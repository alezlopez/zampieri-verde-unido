/**
 * Mensagens da pré-matrícula (WhatsApp Cloud API + e-mail via Resend).
 *
 * Os textos e os nomes dos templates aprovados na Meta ficam TODOS neste arquivo.
 * Quando os templates definitivos chegarem, basta trocar o conteúdo de `TEMPLATES`
 * (nome do template Meta + parâmetros) e o HTML dos e-mails.
 */

export const SITE_URL = "https://colegiozampieri.com.br";
export const FROM_EMAIL = "Colégio Zampieri <noreply@colegiozampieri.com.br>";
export const WHATSAPP_SUPORTE = "5511939341503";

export type EventoMensagem =
  | "recebida"
  | "aprovada"
  | "reprovada"
  | "agendada"
  | "concluida"
  | "documentos_recebidos"
  | "documentos_reenvio"
  | "documentos_aprovados"
  | "contrato_pronto"
  | "matricula_concluida";

export interface DadosMensagem {
  respNome: string;
  respEmail: string;
  respWhatsapp: string;
  alunoNome: string;
  protocolo: string;
  linkAgendamento?: string;
  linkMatricula?: string;
  linkContrato?: string;
  documentosPendentes?: string[];
  motivoReprovacao?: string;
  dataEntrevista?: string;
  descontoPercentual?: number | null;
}

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export const telefoneE164 = (tel: string) => {
  const d = onlyDigits(tel);
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
};

const primeiroNome = (nome: string) => (nome || "").trim().split(/\s+/)[0] || "";

/**
 * Nome do template aprovado na Meta + parâmetros do corpo, por evento.
 * `utility` é a versão UTILITY (sempre entregue, mesmo para quem optou por
 * não receber marketing) e é tentada primeiro; `padrao` é o legado MARKETING.
 */
const TEMPLATES: Partial<
  Record<
    EventoMensagem,
    {
      envVar: string;
      utility?: string;
      padrao: string;
      params: (d: DadosMensagem) => string[];
    }
  >
> = {
  recebida: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_RECEBIDA",
    utility: "prematricula_recebida_u",
    padrao: "prematricula_recebida",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.protocolo],
  },
  aprovada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_APROVADA",
    utility: "prematricula_aprovada_u",
    padrao: "prematricula_aprovadav2",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.linkAgendamento || SITE_URL],
  },
  reprovada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_REPROVADA",
    utility: "prematricula_reprovada_u",
    padrao: "prematricula_reprovada",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome],
  },
  agendada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_AGENDADA",
    utility: "prematricula_agendada_u",
    padrao: "prematricula_agendada",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.dataEntrevista || "-"],
  },
  documentos_reenvio: {
    envVar: "WHATSAPP_TPL_MATRICULA_REENVIO",
    utility: "matricula_documentos_reenvio_u",
    padrao: "matricula_documentos_reenvio",
    params: (d) => [
      primeiroNome(d.respNome),
      d.alunoNome,
      (d.documentosPendentes ?? []).join(", ") || "documentos pendentes",
    ],
  },
  documentos_aprovados: {
    envVar: "WHATSAPP_TPL_MATRICULA_DADOS",
    utility: "matricula_dados_liberados_u",
    padrao: "matricula_dados_liberados",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome],
  },
  concluida: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_CONCLUIDA",
    padrao: "prematricula_entrevista_concluida",
    params: (d) => [
      primeiroNome(d.respNome),
      d.alunoNome,
      `${d.descontoPercentual ?? 0}%`,
    ],
  },
};

/** Imagem usada quando o template aprovado tem cabeçalho de IMAGEM. */
const HEADER_IMAGE_PADRAO = `${SITE_URL}/lovable-uploads/bd571e68-1908-4859-81a4-bc2c0c51fa6a.png`;

/** Override de imagem por evento (secret opcional), ex.: WHATSAPP_IMG_RECEBIDA. */
const imagemPorEvento = (evento: EventoMensagem) =>
  Deno.env.get(`WHATSAPP_IMG_${evento.toUpperCase()}`) || null;

type DefTemplate = {
  nome: string;
  lang: string;
  status: string;
  category: string;
  headerFormat: "IMAGE" | "VIDEO" | "DOCUMENT" | "TEXT" | null;
  headerVars: number;
  headerExemplo: string | null;
  bodyVars: number;
  urlButtonIndex: number | null;
};

const cacheDefs = new Map<string, DefTemplate | null>();

/** Lê a definição real do template na Meta para montar os componentes certos. */
async function definicaoTemplate(nome: string, lang: string): Promise<DefTemplate | null> {
  const chave = `${nome}:${lang}`;
  if (cacheDefs.has(chave)) return cacheDefs.get(chave)!;
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const waba = Deno.env.get("WHATSAPP_WABA_ID") || Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
  if (!token || !waba) {
    console.warn("WHATSAPP_WABA_ID ausente: não é possível ler a definição dos templates na Meta.");
    cacheDefs.set(chave, null);
    return null;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v23.0/${waba}/message_templates?name=${encodeURIComponent(nome)}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await res.json();
    if (!res.ok) {
      console.error(
        `Meta message_templates falhou status=${res.status} waba=${waba} body=${JSON.stringify(json).slice(0, 400)}`,
      );
      cacheDefs.set(chave, null);
      return null;
    }
    const lista: any[] = json?.data ?? [];
    const tpl =
      lista.find((t) => t.name === nome && t.language === lang) ?? lista.find((t) => t.name === nome);
    if (!tpl) {
      console.error(`Template ${nome} não encontrado na WABA ${waba}.`);
      cacheDefs.set(chave, null);
      return null;
    }
    const comps: any[] = tpl.components ?? [];
    const header = comps.find((c) => c.type === "HEADER");
    const body = comps.find((c) => c.type === "BODY");
    const botoes = comps.find((c) => c.type === "BUTTONS")?.buttons ?? [];
    const contarVars = (txt: string) => new Set((txt || "").match(/\{\{\d+\}\}/g) ?? []).size;
    const def: DefTemplate = {
      nome: tpl.name,
      lang: tpl.language,
      status: tpl.status ?? "UNKNOWN",
      category: tpl.category ?? "UNKNOWN",
      headerFormat: header?.format ?? null,
      headerVars: header?.format === "TEXT" ? contarVars(header?.text) : 0,
      headerExemplo: header?.example?.header_handle?.[0] ?? header?.example?.header_url?.[0] ?? null,
      bodyVars: contarVars(body?.text),
      urlButtonIndex: (() => {
        const i = botoes.findIndex((b: any) => b.type === "URL" && /\{\{\d+\}\}/.test(b.url || ""));
        return i >= 0 ? i : null;
      })(),
    };
    cacheDefs.set(chave, def);
    console.log(`Template ${nome} (${lang}) definição=${JSON.stringify(def)}`);
    return def;
  } catch (e) {
    console.error("Erro ao ler definição do template:", e);
    cacheDefs.set(chave, null);
    return null;
  }
}

type Opcoes = {
  headerImagem: boolean;
  headerImagemUrl?: string | null;
  botaoUrl: boolean;
  botaoIndex: number;
  maxBody?: number;
};

/** Link (com token) usado no botão dinâmico do template. */
const linkDoEvento = (evento: EventoMensagem, d: DadosMensagem) =>
  (evento === "aprovada" || evento === "agendada"
    ? d.linkAgendamento || d.linkMatricula
    : d.linkMatricula || d.linkAgendamento) || "";

function montarComponentes(
  evento: EventoMensagem,
  d: DadosMensagem,
  textos: string[],
  opcoes: Opcoes,
) {
  const components: unknown[] = [];
  if (opcoes.headerImagem) {
    // Prioridade: imagem configurada para o evento > imagem do template aprovado
    // na Meta > override global > imagem padrão do site.
    const link =
      imagemPorEvento(evento) ||
      opcoes.headerImagemUrl ||
      Deno.env.get("WHATSAPP_HEADER_IMAGE_URL") ||
      HEADER_IMAGE_PADRAO;
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link } }],
    });
  }
  const corpo = typeof opcoes.maxBody === "number" ? textos.slice(0, opcoes.maxBody) : textos;
  if (corpo.length) {
    components.push({ type: "body", parameters: corpo.map((text) => ({ type: "text", text })) });
  }
  if (opcoes.botaoUrl) {
    const link = linkDoEvento(evento, d);
    const tokenLink = link.match(/[?&]t=([^&#]+)/)?.[1] || "";
    components.push({
      type: "button",
      sub_type: "url",
      index: String(opcoes.botaoIndex),
      parameters: [{ type: "text", text: `?t=${tokenLink}` }],
    });
  }
  return components;
}

/** Erros em que não adianta tentar outra combinação de componentes. */
const ERRO_FATAL = [190, 131026, 131047, 131031, 133010, 132001, 131009];

async function enviarWhatsapp(evento: EventoMensagem, d: DadosMensagem) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    console.warn("WhatsApp não configurado; mensagem não enviada:", evento);
    return;
  }
  // Template de conclusão pode ser desligado com WHATSAPP_TPL_PREMATRICULA_CONCLUIDA_ATIVO=0.
  if (evento === "concluida" && Deno.env.get("WHATSAPP_TPL_PREMATRICULA_CONCLUIDA_ATIVO") === "0") {
    console.log("WhatsApp prematricula[concluida] desativado por configuração");
    return;
  }
  const cfg = TEMPLATES[evento];
  if (!cfg) {
    console.log(`WhatsApp sem template para evento ${evento}; apenas e-mail.`);
    return;
  }
  const nomeTemplate = Deno.env.get(cfg.envVar) || cfg.padrao;
  const lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "pt_BR";
  const textos = cfg.params(d);

  const def = await definicaoTemplate(nomeTemplate, lang);
  const langEnvio = def?.lang || lang;
  const imagemTemplate = def?.headerFormat === "IMAGE" ? def.headerExemplo : null;
  const temImagemConfigurada = !!imagemPorEvento(evento);

  // 1) Combinação exata da definição da Meta (quando conseguimos ler).
  // 2) Matriz de combinações (com/sem imagem, com/sem botão, corpo cheio ou reduzido).
  const tentativas: Opcoes[] = [];
  if (def) {
    tentativas.push({
      headerImagem: def.headerFormat === "IMAGE",
      headerImagemUrl: imagemTemplate,
      botaoUrl: def.urlButtonIndex !== null,
      botaoIndex: def.urlButtonIndex ?? 0,
      maxBody: def.bodyVars,
    });
  }
  for (const headerImagem of [true, false]) {
    for (const botaoUrl of [true, false]) {
      for (const maxBody of [textos.length, Math.max(textos.length - 1, 0)]) {
        tentativas.push({
          headerImagem,
          headerImagemUrl: imagemTemplate,
          botaoUrl,
          botaoIndex: 0,
          maxBody,
        });
      }
    }
  }
  // Sem duplicatas.
  const vistos = new Set<string>();
  const fila = tentativas.filter((o) => {
    const k = JSON.stringify(o);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  let ultimoErro = "";
  for (const opcoes of fila) {
    const components = montarComponentes(evento, d, textos, opcoes);
    const res = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefoneE164(d.respWhatsapp),
        type: "template",
        template: { name: nomeTemplate, language: { code: langEnvio }, components },
      }),
    });
    const texto = await res.text();
    if (res.ok) {
      console.log(
        `WhatsApp prematricula[${evento}] enviado template=${nomeTemplate} lang=${langEnvio} imagemConfigurada=${temImagemConfigurada} opcoes=${JSON.stringify(opcoes)} body=${texto}`,
      );
      return;
    }
    ultimoErro = texto;
    const codigo = (() => {
      try {
        return JSON.parse(texto)?.error?.code;
      } catch {
        return null;
      }
    })();
    console.error(
      `WhatsApp prematricula[${evento}] tentativa falhou status=${res.status} codigo=${codigo} template=${nomeTemplate} opcoes=${JSON.stringify(opcoes)} body=${texto}`,
    );
    if (ERRO_FATAL.includes(codigo)) break;
  }
  console.error(
    `WhatsApp prematricula[${evento}] FALHOU template=${nomeTemplate} to=${telefoneE164(d.respWhatsapp)} erro=${ultimoErro}`,
  );
}




const wrapper = (titulo: string, corpo: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#0F3D24;margin:0 0 12px">${titulo}</h2>
    ${corpo}
    <p style="color:#777;font-size:12px;margin-top:24px;border-top:1px solid #E3EAE1;padding-top:16px">
      Dúvidas? Fale com a gente no WhatsApp
      <a href="https://wa.me/${WHATSAPP_SUPORTE}" style="color:#0F3D24">(11) 93934-1503</a>.
    </p>
  </div>`;

const p = (t: string) => `<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 12px">${t}</p>`;

const botao = (href: string, texto: string) => `
  <p style="margin:20px 0">
    <a href="${href}" style="background:#0F3D24;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:bold">${texto}</a>
  </p>`;

/** Assunto + HTML de cada e-mail. Substituir pelos textos definitivos quando chegarem. */
function montarEmail(evento: EventoMensagem, d: DadosMensagem): { subject: string; html: string } {
  switch (evento) {
    case "recebida":
      return {
        subject: `Recebemos a pré-matrícula de ${d.alunoNome}`,
        html: wrapper(
          "Pré-matrícula recebida",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`Recebemos a pré-matrícula de <strong>${d.alunoNome}</strong>. Protocolo <strong>${d.protocolo}</strong>.`) +
            p("Nossa equipe vai conferir os dados e você receberá um retorno em breve para agendar a Entrevista Familiar."),
        ),
      };
    case "aprovada":
      return {
        subject: `Pré-matrícula aprovada — agende a Entrevista Familiar`,
        html: wrapper(
          "Cadastro aprovado",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`A pré-matrícula de <strong>${d.alunoNome}</strong> foi aprovada. O próximo passo é escolher o melhor horário para a Entrevista Familiar.`) +
            botao(d.linkAgendamento || SITE_URL, "Escolher horário") +
            p("Este link é pessoal e válido apenas para este cadastro."),
        ),
      };
    case "reprovada":
      return {
        subject: `Sobre a pré-matrícula de ${d.alunoNome}`,
        html: wrapper(
          "Pré-matrícula não aprovada",
          p(`Olá, ${primeiroNome(d.respNome)}.`) +
            p(`Não foi possível seguir com a pré-matrícula de <strong>${d.alunoNome}</strong> neste momento.`) +
            (d.motivoReprovacao ? p(`<strong>Motivo:</strong> ${d.motivoReprovacao}`) : "") +
            p("Se acredita que houve algum engano, fale com a nossa equipe."),
        ),
      };
    case "agendada":
      return {
        subject: `Entrevista Familiar agendada — ${d.alunoNome}`,
        html: wrapper(
          "Entrevista agendada",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`A Entrevista Familiar de <strong>${d.alunoNome}</strong> está marcada para <strong>${d.dataEntrevista}</strong>.`) +
            p("Se precisar remarcar, é só falar com a nossa equipe."),
        ),
      };
    case "concluida":
      return {
        subject: `Entrevista concluída — próximos passos da matrícula de ${d.alunoNome}`,
        html: wrapper(
          "Entrevista concluída",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`Foi um prazer receber a família. A entrevista de <strong>${d.alunoNome}</strong> foi concluída.`) +
            p(`Desconto aplicado na mensalidade: <strong>${d.descontoPercentual ?? 0}%</strong>.`) +
            p("O próximo passo é enviar a documentação necessária pelo link abaixo.") +
            botao(d.linkMatricula || SITE_URL, "Enviar documentação") +
            p("Este link é pessoal e válido apenas para este cadastro."),
        ),
      };
    case "documentos_recebidos":
      return {
        subject: `Documentação recebida — ${d.alunoNome}`,
        html: wrapper(
          "Documentação recebida",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`Recebemos toda a documentação da matrícula de <strong>${d.alunoNome}</strong>.`) +
            p("Nossa equipe fará a conferência e, em até <strong>24 horas úteis</strong>, retornaremos com o contrato para assinatura e o link de pagamento.") +
            p("Você pode acompanhar tudo pelo mesmo link, sem precisar fazer nada agora."),
        ),
      };
    case "documentos_reenvio":
      return {
        subject: `Documentação pendente — ${d.alunoNome}`,
        html: wrapper(
          "Documentos pendentes",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`Precisamos que você reenvie alguns documentos da matrícula de <strong>${d.alunoNome}</strong>:`) +
            (d.documentosPendentes?.length
              ? `<ul style="color:#444;font-size:14px;line-height:1.6">${d.documentosPendentes
                  .map((x) => `<li>${x}</li>`)
                  .join("")}</ul>`
              : "") +
            botao(d.linkMatricula || SITE_URL, "Reenviar documentos"),
        ),
      };
    case "documentos_aprovados":
      return {
        subject: `Documentação aprovada — ${d.alunoNome}`,
        html: wrapper(
          "Documentação aprovada",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`A documentação de <strong>${d.alunoNome}</strong> foi conferida e aprovada.`) +
            p("Estamos preparando o contrato de matrícula. Avisaremos assim que estiver pronto para assinatura."),
        ),
      };
    case "contrato_pronto":
      return {
        subject: `Contrato de matrícula pronto — ${d.alunoNome}`,
        html: wrapper(
          "Contrato pronto para assinatura",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`O contrato de matrícula de <strong>${d.alunoNome}</strong> está pronto. Após a assinatura, o pagamento é liberado no mesmo link.`) +
            botao(d.linkMatricula || SITE_URL, "Assinar e pagar"),
        ),
      };
    case "matricula_concluida":
      return {
        subject: `Matrícula confirmada — ${d.alunoNome}`,
        html: wrapper(
          "Matrícula confirmada",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`A matrícula de <strong>${d.alunoNome}</strong> está confirmada. Contrato assinado e pagamento aprovado.`) +
            p("Seja muito bem-vindo à família Zampieri!"),
        ),
      };
  }
}

async function enviarEmail(evento: EventoMensagem, d: DadosMensagem) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY ausente; e-mail não enviado:", evento);
    return;
  }
  const email = (d.respEmail || "").trim().toLowerCase();
  if (!email.includes("@")) return;
  const { subject, html } = montarEmail(evento, d);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html }),
  });
  const texto = await res.text();
  console.log(`Resend prematricula[${evento}] status=${res.status} body=${texto.slice(0, 200)}`);
}

/** Dispara WhatsApp + e-mail sem derrubar o fluxo em caso de falha de um canal. */
export async function notificar(evento: EventoMensagem, d: DadosMensagem) {
  const resultados = await Promise.allSettled([
    enviarWhatsapp(evento, d),
    enviarEmail(evento, d),
  ]);
  resultados.forEach((r) => {
    if (r.status === "rejected") console.error(`notificar[${evento}] falhou:`, r.reason);
  });
}

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
