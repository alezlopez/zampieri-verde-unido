/**
 * Follow-up automático das matrículas de alunos novos (pré-matrícula → matrícula).
 *
 * Etapas, templates aprovados na Meta e envio via webhook do n8n.
 */
import { enviarTemplateWebhook } from "./whatsapp-webhook.ts";

export const SITE = "https://colegiozampieri.com.br";

export type EtapaMatricula =
  | "agendar"
  | "lembrete"
  | "faltou"
  | "documentos"
  | "contrato";

export const TEMPLATES: Record<EtapaMatricula, (seq: number) => string> = {
  agendar: (s) => `matricula_agendar_${s}`,
  lembrete: () => "matricula_entrevista_lembrete",
  faltou: () => "matricula_entrevista_faltou",
  documentos: (s) => `matricula_documentos_${s}`,
  contrato: (s) => `matricula_contrato_${s}`,
};

/** Dias desde a última atividade para cada sequência das etapas diárias. */
export const CADENCIA_DIAS: Record<number, number> = { 1: 3, 2: 6, 3: 9 };

/**
 * A aprovação da pré-matrícula, a conclusão da entrevista e a liberação do
 * contrato já disparam uma mensagem, então a cobrança só começa 3 dias depois.
 */
export const CADENCIA_AGENDAR: Record<number, number> = { 1: 3, 2: 6, 3: 9 };

export const cadenciaDe = (_etapa: EtapaMatricula): Record<number, number> =>
  CADENCIA_DIAS;

export const ETAPAS_DIARIAS: EtapaMatricula[] = ["agendar", "documentos", "contrato"];

export interface CasoFollowup {
  id: string;
  protocolo: string | null;
  token: string | null;
  aluno_nome: string;
  resp_nome: string | null;
  resp_whatsapp: string | null;
  resp_email: string | null;
  serie_pretendida: string | null;
  turno_preferencia: string | null;
  status: string;
  followup_pausado?: boolean | null;
  aprovado_em: string | null;
  agendado_em: string | null;
  entrevista_concluida_em: string | null;
  created_at: string;
  updated_at: string | null;
  entrevista_inicio: string | null;
  matricula_id: string | null;
  matricula_status: string | null;
  contrato_gerado: boolean | null;
  contrato_assinado: boolean | null;
  resp_fin_nome: string | null;
  resp_fin_celular: string | null;
  documentos_aprovados_em: string | null;
  matricula_updated_at: string | null;
  vagas_restantes: number;
  sem_vaga: boolean;
  envios: { etapa: string; sequencia: number; enviado_em: string }[];
}

const e164 = (v: string | null | undefined) => {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(-11);
  return d.length >= 10 ? `55${d}` : null;
};

const primeiroNome = (v: string | null | undefined) =>
  (v || "").trim().split(/\s+/)[0] || "Responsável";

/** Responsável financeiro da matrícula quando já existir; senão o da pré-matrícula. */
export function destinatario(c: CasoFollowup) {
  const finTel = e164(c.resp_fin_celular);
  if (finTel) {
    return { nome: primeiroNome(c.resp_fin_nome || c.resp_nome), telefone: finTel };
  }
  return { nome: primeiroNome(c.resp_nome), telefone: e164(c.resp_whatsapp) };
}

export const dataBR = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export const horaBR = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

export const linkAgendar = (c: CasoFollowup) =>
  `${SITE}/prematricula/agendar${c.token ? `?t=${c.token}` : ""}`;

export const linkPortal = (c: CasoFollowup) =>
  `${SITE}/matricula${c.token ? `?t=${c.token}` : ""}`;

/** Classifica o caso na etapa atual do funil. Null = não precisa de cobrança. */
export function etapaDe(c: CasoFollowup): EtapaMatricula | null {
  if (c.status === "aprovado_aguardando_agendamento") return "agendar";
  if (c.status === "entrevista_agendada") {
    if (!c.entrevista_inicio) return null;
    const passou = new Date(c.entrevista_inicio).getTime() < Date.now() - 2 * 3600000;
    return passou ? "faltou" : "lembrete";
  }
  if (c.status === "entrevista_concluida") {
    const st = c.matricula_status || "";
    if (c.contrato_assinado) return null;
    if (["documentos_aprovados", "contrato_gerado"].includes(st)) return "contrato";
    return "documentos";
  }
  return null;
}

/** Última atividade usada para medir a cadência das etapas diárias. */
export function ultimaAtividade(c: CasoFollowup, etapa: EtapaMatricula): string | null {
  if (etapa === "agendar") return c.aprovado_em || c.updated_at || c.created_at;
  if (etapa === "documentos") return c.matricula_updated_at || c.entrevista_concluida_em;
  if (etapa === "contrato") return c.documentos_aprovados_em || c.matricula_updated_at;
  return null;
}

export function paramsDe(
  c: CasoFollowup,
  etapa: EtapaMatricula,
  nomeResp: string,
): { params: string[]; link: string } {
  switch (etapa) {
    case "agendar":
      return {
        params: [nomeResp, c.aluno_nome, c.serie_pretendida || ""],
        link: linkAgendar(c),
      };
    case "lembrete":
      return {
        params: [
          nomeResp,
          c.aluno_nome,
          c.entrevista_inicio ? dataBR(c.entrevista_inicio) : "",
          c.entrevista_inicio ? horaBR(c.entrevista_inicio) : "",
        ],
        link: linkAgendar(c),
      };
    case "faltou":
      return {
        params: [
          nomeResp,
          c.aluno_nome,
          c.entrevista_inicio ? dataBR(c.entrevista_inicio) : "",
        ],
        link: linkAgendar(c),
      };
    default:
      return { params: [nomeResp, c.aluno_nome], link: linkPortal(c) };
  }
}

export async function enviarFollowupMatricula(
  c: CasoFollowup,
  etapa: EtapaMatricula,
  sequencia: number,
): Promise<{ sucesso: boolean; destino: string | null; template: string; payload: unknown }> {
  const template = TEMPLATES[etapa](sequencia);
  const dest = destinatario(c);
  if (!dest.telefone) {
    return { sucesso: false, destino: null, template, payload: { erro: "sem_telefone" } };
  }

  const { params, link } = paramsDe(c, etapa, dest.nome);
  const body_params: Record<string, string> = {};
  params.forEach((p, i) => (body_params[String(i + 1)] = p));
  const corte = link.lastIndexOf("/") + 1;

  const payload = {
    evento: `matricula_followup_${etapa}_${sequencia}`,
    origem: "matricula_followup",
    template,
    template_utility: template,
    template_fallback: null,
    language: "pt_BR",
    to: dest.telefone,
    telefone_original: c.resp_fin_celular || c.resp_whatsapp || "",
    params,
    body_params,
    button_url_param: link.slice(corte) || null,
    link_base: link.slice(0, corte),
    link,
    dados: {
      prematricula_id: c.id,
      protocolo: c.protocolo,
      nome_aluno: c.aluno_nome,
      responsavel: dest.nome,
      serie: c.serie_pretendida,
      turno: c.turno_preferencia,
      etapa,
      sequencia,
    },
    enviado_em: new Date().toISOString(),
  };

  const sucesso = await enviarTemplateWebhook(payload);
  return { sucesso, destino: dest.telefone, template, payload };
}
