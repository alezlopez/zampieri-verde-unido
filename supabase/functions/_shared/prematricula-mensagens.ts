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
  | "concluida";

export interface DadosMensagem {
  respNome: string;
  respEmail: string;
  respWhatsapp: string;
  alunoNome: string;
  protocolo: string;
  linkAgendamento?: string;
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

/** Nome do template aprovado na Meta + parâmetros do corpo, por evento. */
const TEMPLATES: Record<
  EventoMensagem,
  { envVar: string; padrao: string; params: (d: DadosMensagem) => string[] }
> = {
  recebida: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_RECEBIDA",
    padrao: "prematricula_recebida",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.protocolo],
  },
  aprovada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_APROVADA",
    padrao: "prematricula_aprovada",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.linkAgendamento || SITE_URL],
  },
  reprovada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_REPROVADA",
    padrao: "prematricula_reprovada",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome],
  },
  agendada: {
    envVar: "WHATSAPP_TPL_PREMATRICULA_AGENDADA",
    padrao: "prematricula_agendada",
    params: (d) => [primeiroNome(d.respNome), d.alunoNome, d.dataEntrevista || "-"],
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

async function enviarWhatsapp(evento: EventoMensagem, d: DadosMensagem) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    console.warn("WhatsApp não configurado; mensagem não enviada:", evento);
    return;
  }
  // Template de conclusão ainda não aprovado na Meta: só e-mail por enquanto.
  if (evento === "concluida") {
    console.log("WhatsApp prematricula[concluida] desativado (template pendente)");
    return;
  }
  const cfg = TEMPLATES[evento];
  const nomeTemplate = Deno.env.get(cfg.envVar) || cfg.padrao;
  const lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "pt_BR";

  // Template "aprovada" usa botão de URL dinâmica na Meta.
  // Como a URL-base aprovada termina em /prematricula/agendar, o parâmetro
  // dinâmico precisa levar o sufixo completo: ?t=<token>.
  const usaBotao =
    evento === "aprovada" &&
    Deno.env.get("WHATSAPP_TPL_PREMATRICULA_APROVADA_BOTAO") !== "0";

  const textos = cfg.params(d);
  const corpo = usaBotao ? textos.slice(0, 2) : textos;
  const parameters = corpo.map((text) => ({ type: "text", text }));

  const components: unknown[] = parameters.length ? [{ type: "body", parameters }] : [];
  if (usaBotao) {
    const linkAgendamento = d.linkAgendamento || "";
    const tokenLink = linkAgendamento.match(/[?&]t=([^&#]+)/)?.[1] || "";
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: `?t=${tokenLink}` }],
    });
  }

  const res = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefoneE164(d.respWhatsapp),
      type: "template",
      template: {
        name: nomeTemplate,
        language: { code: lang },
        components,
      },
    }),
  });
  const texto = await res.text();
  console.log(`WhatsApp prematricula[${evento}] status=${res.status} body=${texto}`);
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
        subject: `Entrevista concluída — ${d.alunoNome}`,
        html: wrapper(
          "Entrevista concluída",
          p(`Olá, ${primeiroNome(d.respNome)}!`) +
            p(`Foi um prazer receber a família. A entrevista de <strong>${d.alunoNome}</strong> foi concluída.`) +
            p(`Desconto aplicado na mensalidade: <strong>${d.descontoPercentual ?? 0}%</strong>.`) +
            p("Em breve entraremos em contato com as instruções para a matrícula."),
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
