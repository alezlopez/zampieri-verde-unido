/**
 * Envio de templates de WhatsApp via webhook do n8n.
 *
 * Em vez de chamar a Cloud API da Meta diretamente, o sistema envia para o
 * webhook abaixo TODOS os dados necessários para o n8n montar e disparar o
 * template aprovado.
 */

export const WEBHOOK_TEMPLATES_WA =
  Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") ||
  "https://n8ncz.colegiozampieri.com/webhook/templateswa";

export interface PayloadTemplateWa {
  /** Identificador interno do evento que originou a mensagem. */
  evento: string;
  /** Origem do disparo: prematricula, matricula, otp, rematricula... */
  origem: string;
  /** Nome do template a usar (preferencial). */
  template: string;
  /** Alternativas: versão UTILITY e versão legada/MARKETING. */
  template_utility?: string | null;
  template_fallback?: string | null;
  /** Idioma do template na Meta. */
  language: string;
  /** Destinatário em E.164 (só dígitos, com 55). */
  to: string;
  /** Telefone como foi cadastrado. */
  telefone_original?: string;
  /** Parâmetros do corpo, na ordem {{1}}, {{2}}, ... */
  params: string[];
  /** Mesmos parâmetros indexados por número: { "1": "...", "2": "..." } */
  body_params: Record<string, string>;
  /** Parâmetro do botão de URL dinâmica (quando o template tiver), ex.: "?t=abc". */
  button_url_param?: string | null;
  /** URL completa para onde o botão deve levar. */
  link?: string | null;
  /** Imagem de cabeçalho, quando o template tiver header IMAGE. */
  header_image_url?: string | null;
  /** Campos nomeados (nome do responsável, aluno, protocolo etc.). */
  dados: Record<string, unknown>;
  /** ISO timestamp do disparo. */
  enviado_em: string;
}

/** Envia o payload para o n8n. Nunca lança por padrão (para não derrubar o fluxo). */
export async function enviarTemplateWebhook(
  payload: PayloadTemplateWa,
  opts: { lancarErro?: boolean } = {},
): Promise<boolean> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = Deno.env.get("N8N_WEBHOOK_TOKEN");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(WEBHOOK_TEMPLATES_WA, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const texto = await res.text();
    console.log(
      `n8n templateswa [${payload.origem}/${payload.evento}] template=${payload.template} to=${payload.to} status=${res.status} body=${texto.slice(0, 300)}`,
    );
    if (!res.ok && opts.lancarErro) {
      throw new Error(`webhook_falhou:${res.status}:${texto.slice(0, 120)}`);
    }
    return res.ok;
  } catch (e) {
    console.error(`n8n templateswa [${payload.origem}/${payload.evento}] erro:`, e);
    if (opts.lancarErro) throw e;
    return false;
  }
}
