/**
 * Aviso interno ao financeiro quando uma renegociação 2027 é paga pelo portal,
 * com os dados para dar baixa no sistema interno da escola.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { emailLayout, MARCA } from "./email-brand.ts";
import { FROM_EMAIL } from "./prematricula-mensagens.ts";

const DESTINO_PADRAO = "financeiro@colegiozampieri.com.br";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const brl = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (iso: string | null | undefined) => {
  const [a, m, d] = String(iso ?? "").slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : "-";
};
const cpfFmt = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d || "-";
};

const linha = (rotulo: string, valor: string) =>
  `<tr><td style="padding:6px 0;color:${MARCA.textoSuave};font-size:14px;width:42%;vertical-align:top">${rotulo}</td>` +
  `<td style="padding:6px 0;color:${MARCA.texto};font-size:14px;font-weight:700">${valor}</td></tr>`;

export interface RenegociacaoPaga {
  id: string;
  id_aluno: number;
  row_ids: number[] | null;
  valor_total: number | string | null;
  forma_pagamento: string | null;
  parcelas: number | null;
  asaas_checkout_id: string | null;
}

export async function avisarFinanceiroRenegociacaoPaga(
  admin: SupabaseClient,
  reg: RenegociacaoPaga,
  asaasPagamentoId: string | null,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY ausente; aviso de renegociação paga não enviado", { renegociacao: reg.id });
    return;
  }
  const destino = Deno.env.get("NOTIFICACAO_FINANCEIRO_EMAIL") || DESTINO_PADRAO;

  const [{ data: aluno }, { data: debitos }] = await Promise.all([
    admin.from("alunos_rematricula_2027").select("*").eq("id_aluno", reg.id_aluno).maybeSingle(),
    admin
      .from("devedores_2027")
      .select("evento, vencimento, valor_principal, juros, multa, valor_atualizado")
      .eq("id_aluno", reg.id_aluno)
      .in("row_id", (reg.row_ids ?? []).map(Number))
      .order("vencimento"),
  ]);

  // Mesmo critério do checkout: pai só quando o cadastro indica pai como responsável financeiro
  const a = (aluno ?? {}) as Record<string, unknown>;
  const usaPai = String(a.responsavel_financeiro || "").toLowerCase().includes("pai");
  const resp = (campo: string) => (usaPai ? a[`${campo}_pai`] : a[`${campo}_mae`]) || a[`${campo}_mae`] || a[`${campo}_pai`];

  const parcelas = Number(reg.parcelas || 1);
  const forma = reg.forma_pagamento === "pix"
    ? "PIX à vista"
    : parcelas > 1
    ? `Cartão de crédito em ${parcelas}x`
    : "Cartão de crédito à vista";
  const lista = (debitos ?? []) as { evento: string | null; vencimento: string | null; valor_atualizado: number | null }[];
  const somaAtualizado = lista.reduce((s, d) => s + Number(d.valor_atualizado || 0), 0);

  const tabelaDebitos = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:6px 0 18px">
      <tr>
        <th align="left" style="padding:8px;border-bottom:2px solid ${MARCA.borda};font-size:12px;color:${MARCA.textoSuave}">Débito</th>
        <th align="left" style="padding:8px;border-bottom:2px solid ${MARCA.borda};font-size:12px;color:${MARCA.textoSuave}">Vencimento</th>
        <th align="right" style="padding:8px;border-bottom:2px solid ${MARCA.borda};font-size:12px;color:${MARCA.textoSuave}">Valor atualizado</th>
      </tr>
      ${lista.map((d) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid ${MARCA.borda};font-size:14px">${esc(d.evento || "Mensalidade")}</td>
        <td style="padding:8px;border-bottom:1px solid ${MARCA.borda};font-size:14px">${dataBr(d.vencimento)}</td>
        <td align="right" style="padding:8px;border-bottom:1px solid ${MARCA.borda};font-size:14px">${brl(d.valor_atualizado)}</td>
      </tr>`).join("")}
    </table>`;

  const corpo = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px">
      ${linha("Aluno", `${esc(a.nome_aluno || "-")} (código ${reg.id_aluno})`)}
      ${linha("Curso atual", esc(a.curso_atual || "-"))}
      ${linha("Responsável financeiro", esc(resp("nome") || "-"))}
      ${linha("CPF do responsável", cpfFmt(resp("cpf")))}
      ${linha("Contato", `${esc(resp("celular") || "-")} · ${esc(resp("email") || "-")}`)}
      ${linha("Valor pago", brl(reg.valor_total))}
      ${linha("Forma de pagamento", forma)}
      ${linha("Valor atualizado dos débitos", brl(somaAtualizado))}
      ${linha("Pago em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))}
      ${linha("ID no Asaas", esc(asaasPagamentoId || "-"))}
    </table>
    <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${MARCA.verdeEscuro}">Débitos quitados (${lista.length})</p>
    ${tabelaDebitos}
    <p style="margin:0;font-size:13px;color:${MARCA.textoSuave}">Os débitos já constam como pagos no portal e a rematrícula é liberada automaticamente quando não resta nada em aberto. Dê baixa no sistema interno.</p>`;

  const html = emailLayout({
    titulo: "Renegociação paga",
    etiqueta: "Renegociação 2027 · Financeiro",
    corpo,
    rodape: "Aviso automático enviado quando o Asaas confirma o pagamento.",
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [destino],
      subject: `Renegociação paga — ${String(a.nome_aluno || `aluno ${reg.id_aluno}`)} — ${brl(reg.valor_total)}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error(`aviso renegociação paga falhou status=${res.status} resposta=${(await res.text()).slice(0, 300)}`);
  }
}
