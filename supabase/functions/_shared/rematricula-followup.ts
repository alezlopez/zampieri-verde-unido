/**
 * Follow-up automático da Rematrícula 2027.
 *
 * Define as etapas, os templates aprovados na Meta e o envio (via webhook do n8n)
 * sempre para o responsável financeiro.
 */
import { enviarTemplateWebhook } from "./whatsapp-webhook.ts";

export const LINK_REMATRICULA = "https://colegiozampieri.com.br/rematricula2027";

export type EtapaFollowup = "parou" | "assinar" | "pagar";

/** Dias desde a última atividade para cada sequência (1, 2 e 3). */
export const CADENCIA_DIAS: Record<number, number> = { 1: 1, 2: 3, 3: 6 };

/** Dias de prazo depois do aviso final antes do cancelamento automático. */
export const PRAZO_CANCELAMENTO_DIAS = 3;

export const TEMPLATE_CANCELADA = "rematricula2027_cancelada";

export const templateDe = (etapa: EtapaFollowup, seq: number) =>
  `rematricula2027_${etapa}_${seq}`;

export interface AlunoFollowup {
  id_aluno: number;
  nome_aluno: string;
  responsavel_financeiro: string | null;
  nome_pai: string | null;
  celular_pai: string | null;
  telefone_pai: string | null;
  nome_mae: string | null;
  celular_mae: string | null;
  telefone_mae: string | null;
}

const soDigitos = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

const e164 = (v: string | null | undefined) => {
  const d = soDigitos(v);
  if (d.length < 10) return null;
  return d.startsWith("55") ? d : `55${d}`;
};

/** Responsável financeiro: nome + telefone. Cai no contato disponível se necessário. */
export function destinatario(aluno: AlunoFollowup): {
  nome: string;
  telefone: string | null;
  telefone_original: string;
  papel: string;
} {
  const rf = (aluno.responsavel_financeiro || "").toLowerCase();
  const pai = {
    nome: aluno.nome_pai || "",
    tel: aluno.celular_pai || aluno.telefone_pai || "",
    papel: "pai",
  };
  const mae = {
    nome: aluno.nome_mae || "",
    tel: aluno.celular_mae || aluno.telefone_mae || "",
    papel: "mae",
  };

  let escolhido = null as typeof pai | null;
  if (rf.includes("pai")) escolhido = pai;
  else if (rf.includes("mae") || rf.includes("mãe")) escolhido = mae;

  if (!escolhido || !e164(escolhido.tel)) {
    escolhido = e164(mae.tel) ? mae : e164(pai.tel) ? pai : escolhido || mae;
  }

  const primeiroNome = (escolhido.nome || "").trim().split(/\s+/)[0] || "responsável";
  return {
    nome: primeiroNome,
    telefone: e164(escolhido.tel),
    telefone_original: escolhido.tel,
    papel: escolhido.papel,
  };
}

export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );

export const dataBR = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d);

/** Envia um template de follow-up e devolve o resultado para registro. */
export async function enviarFollowup(opts: {
  aluno: AlunoFollowup;
  etapa: EtapaFollowup | "cancelada";
  sequencia: number;
  template: string;
  params: string[];
  link?: string | null;
  dados?: Record<string, unknown>;
}): Promise<{ sucesso: boolean; destino: string | null; payload: unknown }> {
  const dest = destinatario(opts.aluno);
  const body_params: Record<string, string> = {};
  opts.params.forEach((p, i) => (body_params[String(i + 1)] = p));

  if (!dest.telefone) {
    return { sucesso: false, destino: null, payload: { erro: "sem_telefone" } };
  }

  const linkFinal = opts.link ?? LINK_REMATRICULA;
  // Botão de URL dinâmica da Meta: base fixa + sufixo variável ({{1}})
  const corte = linkFinal.lastIndexOf("/") + 1;
  const link_base = linkFinal.slice(0, corte);
  const button_url_param = linkFinal.slice(corte) || null;

  const payload = {
    evento: `${opts.etapa}_${opts.sequencia}`,
    origem: "rematricula_followup",
    template: opts.template,
    template_utility: opts.template,
    template_fallback: null,
    language: "pt_BR",
    to: dest.telefone,
    telefone_original: dest.telefone_original,
    params: opts.params,
    body_params,
    button_url_param,
    link_base,
    link: linkFinal,

    dados: {
      id_aluno: opts.aluno.id_aluno,
      nome_aluno: opts.aluno.nome_aluno,
      responsavel: dest.nome,
      papel_responsavel: dest.papel,
      etapa: opts.etapa,
      sequencia: opts.sequencia,
      ...(opts.dados ?? {}),
    },
    enviado_em: new Date().toISOString(),
  };

  const sucesso = await enviarTemplateWebhook(payload);
  return { sucesso, destino: dest.telefone, payload };
}

/** Mensagem de cancelamento (automático ou manual). */
export async function enviarCancelamento(aluno: AlunoFollowup, motivo: string) {
  const dest = destinatario(aluno);
  return await enviarFollowup({
    aluno,
    etapa: "cancelada",
    sequencia: 0,
    template: TEMPLATE_CANCELADA,
    params: [dest.nome, aluno.nome_aluno, motivo],
    dados: { motivo },
  });
}
