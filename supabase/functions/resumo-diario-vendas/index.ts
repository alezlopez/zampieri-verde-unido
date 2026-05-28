import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const DESTINATARIO = "alexandre.zampieri@colegiozampieri.com.br";
const REMETENTE = "Colégio Zampieri <nao-responda@colegiozampieri.com.br>";

// Janela "hoje" em America/Sao_Paulo (UTC-3, sem DST atualmente)
function janelaHojeBRT(): { inicio: string; fim: string; label: string } {
  const now = new Date();
  // Convert to BRT (UTC-3)
  const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = brtNow.getUTCFullYear();
  const m = brtNow.getUTCMonth();
  const d = brtNow.getUTCDate();
  // 00:00 BRT = 03:00 UTC mesmo dia
  const inicio = new Date(Date.UTC(y, m, d, 3, 0, 0));
  const fim = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999));
  const label = `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${y}`;
  return { inicio: inicio.toISOString(), fim: fim.toISOString(), label };
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Agg {
  qtd: number;
  bruto: number;
  liquido: number;
  pendentes: number;
}
const novoAgg = (): Agg => ({ qtd: 0, bruto: 0, liquido: 0, pendentes: 0 });

function somar(agg: Agg, valorBruto: number | null, valorLiquido: number | null) {
  agg.qtd += 1;
  agg.bruto += Number(valorBruto || 0);
  if (valorLiquido !== null && valorLiquido !== undefined) {
    agg.liquido += Number(valorLiquido);
  } else {
    agg.pendentes += 1;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { inicio, fim, label } = janelaHojeBRT();

    // 1) Eventos ativos
    const { data: eventos, error: evErr } = await admin
      .from("eventos")
      .select("id, titulo, data_evento, ativo")
      .eq("ativo", true)
      .order("data_evento", { ascending: true });
    if (evErr) throw evErr;

    const eventoIds = (eventos || []).map((e: any) => e.id);

    // Ingressos pagos (histórico) para os eventos ativos
    const { data: ingTotais, error: itErr } = eventoIds.length
      ? await admin
          .from("ingressos")
          .select("evento_id, valor_bruto, valor_liquido, valor_total, data_pagamento, cortesia, status")
          .in("evento_id", eventoIds)
          .eq("status", "pago")
          .eq("cortesia", false)
          .limit(20000)
      : { data: [] as any[], error: null };
    if (itErr) throw itErr;

    // 2) Produtos ativos
    const { data: produtos, error: prErr } = await admin
      .from("produtos")
      .select("id, nome, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (prErr) throw prErr;

    const produtoIds = (produtos || []).map((p: any) => p.id);

    const { data: pedTotais, error: ptErr } = produtoIds.length
      ? await admin
          .from("pedidos_produtos")
          .select("produto_id, valor_bruto, valor_liquido, valor_total, data_pagamento, status")
          .in("produto_id", produtoIds)
          .eq("status", "pago")
          .limit(20000)
      : { data: [] as any[], error: null };
    if (ptErr) throw ptErr;

    // Agregar
    const ingPorEvento: Record<string, { total: Agg; dia: Agg }> = {};
    for (const e of eventos || []) ingPorEvento[e.id] = { total: novoAgg(), dia: novoAgg() };
    for (const r of (ingTotais || []) as any[]) {
      const bruto = r.valor_bruto !== null && r.valor_bruto !== undefined ? Number(r.valor_bruto) : Number(r.valor_total || 0);
      const liquido = r.valor_liquido !== null && r.valor_liquido !== undefined ? Number(r.valor_liquido) : null;
      const slot = ingPorEvento[r.evento_id];
      if (!slot) continue;
      somar(slot.total, bruto, liquido);
      if (r.data_pagamento && r.data_pagamento >= inicio && r.data_pagamento <= fim) {
        somar(slot.dia, bruto, liquido);
      }
    }

    const prodPorProduto: Record<string, { total: Agg; dia: Agg }> = {};
    for (const p of produtos || []) prodPorProduto[p.id] = { total: novoAgg(), dia: novoAgg() };
    for (const r of (pedTotais || []) as any[]) {
      const bruto = r.valor_bruto !== null && r.valor_bruto !== undefined ? Number(r.valor_bruto) : Number(r.valor_total || 0);
      const liquido = r.valor_liquido !== null && r.valor_liquido !== undefined ? Number(r.valor_liquido) : null;
      const slot = prodPorProduto[r.produto_id];
      if (!slot) continue;
      somar(slot.total, bruto, liquido);
      if (r.data_pagamento && r.data_pagamento >= inicio && r.data_pagamento <= fim) {
        somar(slot.dia, bruto, liquido);
      }
    }

    // Totais gerais
    const totalGeral = { ingressos: { total: novoAgg(), dia: novoAgg() }, produtos: { total: novoAgg(), dia: novoAgg() } };
    for (const k of Object.keys(ingPorEvento)) {
      const s = ingPorEvento[k];
      totalGeral.ingressos.total.qtd += s.total.qtd;
      totalGeral.ingressos.total.bruto += s.total.bruto;
      totalGeral.ingressos.total.liquido += s.total.liquido;
      totalGeral.ingressos.total.pendentes += s.total.pendentes;
      totalGeral.ingressos.dia.qtd += s.dia.qtd;
      totalGeral.ingressos.dia.bruto += s.dia.bruto;
      totalGeral.ingressos.dia.liquido += s.dia.liquido;
      totalGeral.ingressos.dia.pendentes += s.dia.pendentes;
    }
    for (const k of Object.keys(prodPorProduto)) {
      const s = prodPorProduto[k];
      totalGeral.produtos.total.qtd += s.total.qtd;
      totalGeral.produtos.total.bruto += s.total.bruto;
      totalGeral.produtos.total.liquido += s.total.liquido;
      totalGeral.produtos.total.pendentes += s.total.pendentes;
      totalGeral.produtos.dia.qtd += s.dia.qtd;
      totalGeral.produtos.dia.bruto += s.dia.bruto;
      totalGeral.produtos.dia.liquido += s.dia.liquido;
      totalGeral.produtos.dia.pendentes += s.dia.pendentes;
    }

    // HTML
    const corPrim = "#0a7a3b";
    const corSec = "#e6f4ec";
    const linhaAgg = (label: string, a: Agg) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${label}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${a.qtd}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${brl(a.bruto)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${brl(a.liquido)}${a.pendentes > 0 ? ` <span style="color:#999;font-size:11px;">(${a.pendentes} pend.)</span>` : ""}</td>
      </tr>`;

    const tabelaEventos = (eventos || []).map((e: any) => {
      const s = ingPorEvento[e.id];
      return `
      <tr><td colspan="4" style="padding:10px;background:${corSec};font-weight:bold;color:${corPrim};">${e.titulo}</td></tr>
      ${linhaAgg("Hoje", s.dia)}
      ${linhaAgg("Total", s.total)}`;
    }).join("");

    const tabelaProdutos = (produtos || []).map((p: any) => {
      const s = prodPorProduto[p.id];
      return `
      <tr><td colspan="4" style="padding:10px;background:${corSec};font-weight:bold;color:${corPrim};">${p.nome}</td></tr>
      ${linhaAgg("Hoje", s.dia)}
      ${linhaAgg("Total", s.total)}`;
    }).join("");

    const cabecalhoTabela = `
      <tr>
        <th style="padding:8px 10px;text-align:left;border-bottom:2px solid ${corPrim};">Período</th>
        <th style="padding:8px 10px;text-align:right;border-bottom:2px solid ${corPrim};">Qtd</th>
        <th style="padding:8px 10px;text-align:right;border-bottom:2px solid ${corPrim};">Bruto</th>
        <th style="padding:8px 10px;text-align:right;border-bottom:2px solid ${corPrim};">Líquido</th>
      </tr>`;

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#222;">
      <h2 style="color:${corPrim};margin:0 0 4px;">Resumo de Vendas — ${label}</h2>
      <p style="color:#666;margin:0 0 20px;">Ingressos e produtos ativos · gerado às 20h (BRT)</p>

      <h3 style="color:${corPrim};border-bottom:2px solid ${corPrim};padding-bottom:4px;">Totais Gerais</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${cabecalhoTabela}
        <tr><td colspan="4" style="padding:8px 10px;background:${corSec};font-weight:bold;">Ingressos</td></tr>
        ${linhaAgg("Hoje", totalGeral.ingressos.dia)}
        ${linhaAgg("Total", totalGeral.ingressos.total)}
        <tr><td colspan="4" style="padding:8px 10px;background:${corSec};font-weight:bold;">Produtos</td></tr>
        ${linhaAgg("Hoje", totalGeral.produtos.dia)}
        ${linhaAgg("Total", totalGeral.produtos.total)}
      </table>

      <h3 style="color:${corPrim};border-bottom:2px solid ${corPrim};padding-bottom:4px;">Ingressos por Evento Ativo</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${cabecalhoTabela}
        ${tabelaEventos || `<tr><td colspan="4" style="padding:10px;color:#999;">Nenhum evento ativo.</td></tr>`}
      </table>

      <h3 style="color:${corPrim};border-bottom:2px solid ${corPrim};padding-bottom:4px;">Produtos Ativos</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${cabecalhoTabela}
        ${tabelaProdutos || `<tr><td colspan="4" style="padding:10px;color:#999;">Nenhum produto ativo.</td></tr>`}
      </table>

      <p style="color:#999;font-size:11px;margin-top:30px;">
        Valores líquidos pendentes (quando indicados) correspondem a vendas pagas cujo cálculo de taxa ainda não foi processado.
      </p>
    </div>`;

    // Envio via Resend (gateway)
    const subject = `Resumo de vendas — ${label}`;
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [DESTINATARIO],
        subject,
        html,
      }),
    });

    const respBody = await resp.text();
    if (!resp.ok) {
      throw new Error(`Resend ${resp.status}: ${respBody}`);
    }

    return new Response(JSON.stringify({ ok: true, enviado_para: DESTINATARIO, data: label }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[resumo-diario-vendas]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
