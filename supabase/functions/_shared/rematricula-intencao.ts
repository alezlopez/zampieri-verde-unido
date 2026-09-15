/**
 * Pesquisa de intenção da Rematrícula 2027.
 * Templates com botões de resposta rápida, enviados via webhook do n8n.
 */
import {
  AlunoFollowup,
  destinatario,
  LINK_REMATRICULA,
} from "./rematricula-followup.ts";
import { enviarTemplateWebhook } from "./whatsapp-webhook.ts";

export type TipoIntencao = "pergunta" | "lembrete" | "motivo" | "link";

export const TEMPLATE_INTENCAO: Record<TipoIntencao, string> = {
  pergunta: "rematricula2027_intencao_1",
  lembrete: "rematricula2027_intencao_lembrete",
  motivo: "rematricula2027_intencao_motivo",
  link: "rematricula2027_intencao_link",
};

/** Dias desde o último envio para cada sequência. */
export const CADENCIA_SEM_RESPOSTA: Record<number, number> = { 1: 0, 2: 3, 3: 7 };
export const CADENCIA_INDECISO: Record<number, number> = { 1: 3, 2: 5 };

export const STATUS_VALIDOS = [
  "sem_resposta",
  "vai_rematricular",
  "indeciso",
  "nao_vai",
] as const;
export type StatusIntencao = (typeof STATUS_VALIDOS)[number];

export const MOTIVOS: Record<string, string> = {
  financeiro: "Financeiro",
  mudanca: "Mudança de cidade/escola",
  insatisfacao: "Insatisfação",
  outro: "Outro",
};

export async function enviarIntencao(opts: {
  aluno: AlunoFollowup;
  tipo: TipoIntencao;
  sequencia?: number;
  params: string[];
  link?: string | null;
}): Promise<{ sucesso: boolean; destino: string | null; payload: unknown }> {
  const dest = destinatario(opts.aluno);
  if (!dest.telefone) {
    return { sucesso: false, destino: null, payload: { erro: "sem_telefone" } };
  }

  const body_params: Record<string, string> = {};
  opts.params.forEach((p, i) => (body_params[String(i + 1)] = p));

  const linkFinal = opts.link ?? LINK_REMATRICULA;
  const corte = linkFinal.lastIndexOf("/") + 1;

  const template = TEMPLATE_INTENCAO[opts.tipo];
  const payload = {
    evento: `intencao_${opts.tipo}${opts.sequencia ? `_${opts.sequencia}` : ""}`,
    origem: "rematricula_intencao",
    template,
    template_utility: template,
    template_fallback: null,
    language: "pt_BR",
    to: dest.telefone,
    telefone_original: dest.telefone_original,
    params: opts.params,
    body_params,
    button_url_param: linkFinal.slice(corte) || null,
    link_base: linkFinal.slice(0, corte),
    link: linkFinal,
    dados: {
      id_aluno: opts.aluno.id_aluno,
      nome_aluno: opts.aluno.nome_aluno,
      responsavel: dest.nome,
      papel_responsavel: dest.papel,
      tipo: opts.tipo,
      sequencia: opts.sequencia ?? 1,
      // o n8n devolve a resposta dos botões para esta função:
      callback: "rematricula-2027-intencao-resposta",
    },
    enviado_em: new Date().toISOString(),
  };

  const sucesso = await enviarTemplateWebhook(payload);
  return { sucesso, destino: dest.telefone, payload };
}

export const CAMPOS_INTENCAO =
  "id_aluno, nome_aluno, curso_2027, responsavel_financeiro, nome_pai, celular_pai, telefone_pai, nome_mae, celular_mae, telefone_mae, contrato_gerado, contrato_assinado, rematricula_concluida, cancelada, rematricula_liberada, turno_escolhido";
