/**
 * Aviso interno por e-mail (template "aviso-agenda-interno" publicado no Resend) quando uma
 * visita ou entrevista é agendada/reagendada. Vai para a secretaria e a coordenação.
 * Roda em segundo plano: falha no e-mail nunca afeta o agendamento.
 */
import { FROM_EMAIL, formatarDataHora, SITE_URL } from "./prematricula-mensagens.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

const DESTINOS_PADRAO = ["secretaria@colegiozampieri.com.br", "coordenacao@colegiozampieri.com.br"];

export interface AvisoAgenda {
  tipo: "visita" | "entrevista";
  reagendada?: boolean;
  inicio: string;
  responsavel: string;
  telefone?: string | null;
  aluno?: string | null;
  serie?: string | null;
  turno?: string | null;
  origem?: string | null;
  /** Caminho no site, ex.: /matricula/leads */
  painel: string;
}

const telefoneFmt = (v?: string | null) => {
  const d = String(v ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
};

const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso)).replace(", ", " às ");

/** "Anúncio Meta · campanha X" a partir da origem gravada no lead do site. */
export const origemDoLead = (l: {
  utm_source?: string | null;
  utm_campaign?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  gclid?: string | null;
  utm_medium?: string | null;
}) => {
  const canal = canalDoLead(l);
  return l.utm_campaign ? `${canal} · campanha ${l.utm_campaign}` : canal;
};

/** Mesma regra do painel (src/pages/LeadsSiteAdmin.tsx, função canal). */
const canalDoLead = (l: {
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  gclid?: string | null;
}) => {
  const fonte = (l.utm_source || "").toLowerCase();
  const meio = (l.utm_medium || "").toLowerCase();
  const meta = /^(fb|facebook|ig|instagram|meta)/.test(fonte);
  const google = /google/.test(fonte);
  if (fonte === "whatsapp" && meio === "secretaria") return "WhatsApp (link da secretaria)";
  // UTM explícita de tráfego orgânico vale mais que o fbclid que o Instagram/Facebook anexam a qualquer link
  if (/^(bio|organic|organico|social|post|stories|story|reels|perfil|link_?in_?bio)/.test(meio)) {
    return `Orgânico: ${l.utm_source || "sem fonte"} (${l.utm_medium})`;
  }
  if (/^(cpc|ppc|cpm|paid|pago|ads?|anuncio|display)/.test(meio)) {
    return meta ? "Anúncio Meta" : google ? "Anúncio Google" : `Anúncio (${l.utm_source || "sem fonte"})`;
  }
  // Sem utm_medium: links de anúncio antigos e cliques com fbclid/gclid
  if (l.fbclid || l.fbc || meta) return "Anúncio Meta";
  if (l.gclid || google) return "Anúncio Google";
  if (fonte) return `Campanha (${l.utm_source})`;
  return "Site (sem campanha)";
};

async function enviar(a: AvisoAgenda) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const destinos = (Deno.env.get("NOTIFICACAO_AGENDA_EMAILS") || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const nomeTipo = a.tipo === "visita" ? "visita" : "entrevista";
  const titulo = a.reagendada ? `${nomeTipo[0].toUpperCase()}${nomeTipo.slice(1)} reagendada` : `Nova ${nomeTipo} agendada`;
  const fone = String(a.telefone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const serie = [a.serie, a.turno?.toLowerCase()].filter(Boolean).join(" · ");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: destinos.length ? destinos : DESTINOS_PADRAO,
      subject: `${a.reagendada ? `${nomeTipo[0].toUpperCase()}${nomeTipo.slice(1)} reagendada` : `Nova ${nomeTipo}`}: ${dataCurta(a.inicio)} · ${a.responsavel}`,
      template: {
        id: "aviso-agenda-interno",
        variables: {
          TITULO: titulo,
          DATA_HORA: formatarDataHora(a.inicio),
          RESPONSAVEL: a.responsavel || "—",
          TELEFONE: telefoneFmt(a.telefone) || "—",
          ALUNO: a.aluno || (a.tipo === "visita" ? "Não informado (visita)" : "—"),
          SERIE: serie || "—",
          ORIGEM: a.origem || "—",
          LINK_PAINEL: `${SITE_URL}${a.painel}`,
          LINK_WHATSAPP: fone ? `https://wa.me/55${fone}` : `${SITE_URL}${a.painel}`,
        },
      },
    }),
  });
  if (!res.ok) console.error(`aviso agenda interno status=${res.status} resposta=${(await res.text()).slice(0, 300)}`);
}

export function avisarAgendaInterna(a: AvisoAgenda) {
  const p = enviar(a).catch((e) => console.error("aviso agenda interno falhou:", (e as Error)?.message ?? e));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p);
  return p;
}
