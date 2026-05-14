import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputePedidosProdutos } from "../_shared/produtos-financeiro.ts";

const FilterSchema = z.object({
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  produto_id: z.string().uuid().optional(),
  variacao_id: z.string().uuid().optional(),
  evento_id: z.string().uuid().optional(),
  forma_pagamento: z.enum(["pix", "credit_card", "todos"]).optional(),
  status: z.string().optional(),
});

async function sincronizarPendentes(admin: any) {
  const { data: pendentes, error } = await admin
    .from("pedidos_produtos")
    .select("id, checkout_id, asaas_payment_id")
    .eq("status", "pago")
    .is("valor_liquido", null)
    .limit(2000);
  if (error || !pendentes?.length) return;

  const porCheckout = new Map<string, { ids: string[]; stableId: string | null }>();
  const porPayment = new Map<string, string[]>();
  for (const p of pendentes) {
    if (p.checkout_id) {
      if (!porCheckout.has(p.checkout_id)) porCheckout.set(p.checkout_id, { ids: [], stableId: p.asaas_payment_id });
      const g = porCheckout.get(p.checkout_id)!;
      g.ids.push(p.id);
      if (!g.stableId && p.asaas_payment_id) g.stableId = p.asaas_payment_id;
    } else if (p.asaas_payment_id) {
      if (!porPayment.has(p.asaas_payment_id)) porPayment.set(p.asaas_payment_id, []);
      porPayment.get(p.asaas_payment_id)!.push(p.id);
    }
  }

  for (const [checkoutId, g] of porCheckout) {
    const stableId = g.stableId || "";
    await recomputePedidosProdutos(admin, {
      checkoutId,
      paymentId: stableId.startsWith("pay_") ? stableId : null,
      installmentId: stableId && !stableId.startsWith("pay_") ? stableId : null,
      pedidoIds: g.ids,
    }).catch((e) => console.warn("[relatorio-produtos] sync checkout falhou", checkoutId, e?.message || e));
  }
  for (const [stableId, ids] of porPayment) {
    await recomputePedidosProdutos(admin, {
      paymentId: stableId.startsWith("pay_") ? stableId : null,
      installmentId: !stableId.startsWith("pay_") ? stableId : null,
      pedidoIds: ids,
    }).catch((e) => console.warn("[relatorio-produtos] sync payment falhou", stableId, e?.message || e));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = FilterSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const f = parsed.data;
    const status = f.status && f.status !== "todos" ? f.status : "pago";

    if (status === "pago" || f.status === "todos") {
      await sincronizarPendentes(admin);
    }

    let q = admin
      .from("pedidos_produtos")
      .select(`
        id, produto_id, variacao_id, evento_id, status, forma_pagamento, parcelas,
        nome_comprador, cpf_comprador, email_comprador, quantidade, valor_unitario,
        valor_total, valor_bruto, valor_liquido, taxa_total,
        data_pagamento, data_credito, retirado_em, created_at,
        produtos:produto_id (id, nome),
        produto_variacoes:variacao_id (id, nome),
        eventos:evento_id (id, titulo, data_evento)
      `)
      .order("data_pagamento", { ascending: false, nullsFirst: false })
      .limit(2000);

    if (status !== "todos") q = q.eq("status", status);
    if (f.produto_id) q = q.eq("produto_id", f.produto_id);
    if (f.variacao_id) q = q.eq("variacao_id", f.variacao_id);
    if (f.evento_id) q = q.eq("evento_id", f.evento_id);
    if (f.forma_pagamento && f.forma_pagamento !== "todos") q = q.eq("forma_pagamento", f.forma_pagamento);
    if (f.data_inicio) q = q.gte("data_pagamento", f.data_inicio);
    if (f.data_fim) q = q.lte("data_pagamento", f.data_fim);

    const { data: rows, error } = await q;
    if (error) throw error;

    const lista = (rows || []).map((r: any) => {
      const liquidoCalculado = r.valor_liquido !== null && r.valor_liquido !== undefined;
      const brutoCalculado = r.valor_bruto !== null && r.valor_bruto !== undefined;
      const bruto = Number(brutoCalculado ? r.valor_bruto : (r.valor_total ?? 0));
      const liquido = liquidoCalculado ? Number(r.valor_liquido) : null;
      const taxa = liquidoCalculado
        ? Number(r.taxa_total ?? Math.max(bruto - (liquido as number), 0))
        : null;
      return {
        id: r.id,
        produto_id: r.produto_id,
        produto_nome: r.produtos?.nome || "—",
        variacao_id: r.variacao_id,
        variacao_nome: r.produto_variacoes?.nome || "—",
        evento_id: r.evento_id,
        evento_titulo: r.eventos?.titulo || null,
        status: r.status,
        forma_pagamento: r.forma_pagamento,
        parcelas: r.parcelas,
        nome_comprador: r.nome_comprador,
        cpf_comprador: r.cpf_comprador,
        email_comprador: r.email_comprador,
        quantidade: r.quantidade,
        valor_unitario: Number(r.valor_unitario || 0),
        retirado: !!r.retirado_em,
        retirado_em: r.retirado_em,
        data_pagamento: r.data_pagamento,
        data_credito: r.data_credito,
        valor_bruto: bruto,
        valor_liquido: liquido,
        taxa_total: taxa,
        liquido_pendente_calculo: r.status === "pago" && !liquidoCalculado,
      };
    });

    const tot = {
      bruto: 0, liquido: 0, taxa: 0,
      qtd: 0, qtd_unidades: 0,
      qtd_liquido_pendente: 0,
      bruto_liquido_pendente: 0,
      qtd_retirados: 0,
    };
    const porProduto: Record<string, { produto_id: string; produto_nome: string; bruto: number; liquido: number; taxa: number; qtd: number; unidades: number; pendentes: number }> = {};
    const porVariacao: Record<string, { variacao_id: string; produto_nome: string; variacao_nome: string; bruto: number; liquido: number; qtd: number; unidades: number }> = {};
    const porForma: Record<string, { forma: string; bruto: number; liquido: number; taxa: number; qtd: number; pendentes: number }> = {};

    for (const r of lista) {
      tot.qtd++;
      tot.qtd_unidades += Number(r.quantidade || 0);
      if (r.retirado) tot.qtd_retirados++;
      tot.bruto += r.valor_bruto;
      if (r.valor_liquido !== null) {
        tot.liquido += r.valor_liquido;
        tot.taxa += r.taxa_total || 0;
      } else if (r.liquido_pendente_calculo) {
        tot.qtd_liquido_pendente++;
        tot.bruto_liquido_pendente += r.valor_bruto;
      }

      const pk = r.produto_id;
      porProduto[pk] = porProduto[pk] || { produto_id: pk, produto_nome: r.produto_nome, bruto: 0, liquido: 0, taxa: 0, qtd: 0, unidades: 0, pendentes: 0 };
      porProduto[pk].bruto += r.valor_bruto;
      porProduto[pk].qtd++;
      porProduto[pk].unidades += Number(r.quantidade || 0);
      if (r.valor_liquido !== null) {
        porProduto[pk].liquido += r.valor_liquido;
        porProduto[pk].taxa += r.taxa_total || 0;
      } else if (r.liquido_pendente_calculo) {
        porProduto[pk].pendentes++;
      }

      const vk = r.variacao_id;
      porVariacao[vk] = porVariacao[vk] || { variacao_id: vk, produto_nome: r.produto_nome, variacao_nome: r.variacao_nome, bruto: 0, liquido: 0, qtd: 0, unidades: 0 };
      porVariacao[vk].bruto += r.valor_bruto;
      porVariacao[vk].qtd++;
      porVariacao[vk].unidades += Number(r.quantidade || 0);
      if (r.valor_liquido !== null) porVariacao[vk].liquido += r.valor_liquido;

      let fk = r.forma_pagamento || "—";
      if (fk === "credit_card" && (r.parcelas || 1) > 1) fk = "credit_card_parcelado";
      porForma[fk] = porForma[fk] || { forma: fk, bruto: 0, liquido: 0, taxa: 0, qtd: 0, pendentes: 0 };
      porForma[fk].bruto += r.valor_bruto;
      porForma[fk].qtd++;
      if (r.valor_liquido !== null) {
        porForma[fk].liquido += r.valor_liquido;
        porForma[fk].taxa += r.taxa_total || 0;
      } else if (r.liquido_pendente_calculo) {
        porForma[fk].pendentes++;
      }
    }

    const ticketBase = lista.filter((r) => r.status === "pago");
    const ticketMedio = ticketBase.length > 0 ? tot.bruto / ticketBase.length : 0;
    const brutoComLiquido = tot.bruto - tot.bruto_liquido_pendente;

    return new Response(JSON.stringify({
      lista,
      totais: {
        ...tot,
        bruto: Number(tot.bruto.toFixed(2)),
        liquido: Number(tot.liquido.toFixed(2)),
        taxa: Number(tot.taxa.toFixed(2)),
        bruto_liquido_pendente: Number(tot.bruto_liquido_pendente.toFixed(2)),
        ticket_medio: Number(ticketMedio.toFixed(2)),
        percentual_taxa: brutoComLiquido > 0 ? Number(((tot.taxa / brutoComLiquido) * 100).toFixed(2)) : 0,
      },
      por_produto: Object.values(porProduto),
      por_variacao: Object.values(porVariacao),
      por_forma: Object.values(porForma),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[relatorio-produtos]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
