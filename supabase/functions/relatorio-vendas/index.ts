import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";

const FilterSchema = z.object({
  data_inicio: z.string().optional(), // ISO date
  data_fim: z.string().optional(),
  evento_id: z.string().uuid().optional(),
  forma_pagamento: z.enum(["pix", "credit_card", "todos"]).optional(),
  status: z.string().optional(), // pago | pendente | todos
  incluir_cortesias: z.boolean().optional(),
});

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

    let q = admin
      .from("ingressos")
      .select(`
        id, evento_id, status, forma_pagamento, parcelas,
        nome_comprador, nome_participante, tipo_participante, tipo_ingresso,
        codigo_aluno, cortesia, created_at, data_pagamento, data_credito,
        valor_bruto, valor_liquido, taxa_total, valor_total,
        eventos:evento_id (id, titulo, data_evento)
      `)
      .order("data_pagamento", { ascending: false, nullsFirst: false })
      .limit(2000);

    if (status !== "todos") q = q.eq("status", status);
    if (f.evento_id) q = q.eq("evento_id", f.evento_id);
    if (f.forma_pagamento && f.forma_pagamento !== "todos") q = q.eq("forma_pagamento", f.forma_pagamento);
    if (f.data_inicio) q = q.gte("data_pagamento", f.data_inicio);
    if (f.data_fim) q = q.lte("data_pagamento", f.data_fim);
    if (!f.incluir_cortesias) q = q.eq("cortesia", false);

    const { data: rows, error } = await q;
    if (error) throw error;

    const lista = (rows || []).map((r: any) => {
      const bruto = Number(r.valor_bruto ?? r.valor_total ?? 0);
      const liquido = Number(r.valor_liquido ?? 0);
      const taxa = Number(r.taxa_total ?? Math.max(bruto - liquido, 0));
      return {
        id: r.id,
        evento_id: r.evento_id,
        evento_titulo: r.eventos?.titulo || "—",
        evento_data: r.eventos?.data_evento || null,
        status: r.status,
        forma_pagamento: r.forma_pagamento,
        parcelas: r.parcelas,
        nome_comprador: r.nome_comprador,
        nome_participante: r.nome_participante,
        tipo_participante: r.tipo_participante,
        tipo_ingresso: r.tipo_ingresso,
        cortesia: r.cortesia,
        codigo_aluno: r.codigo_aluno,
        data_pagamento: r.data_pagamento,
        data_credito: r.data_credito,
        valor_bruto: bruto,
        valor_liquido: liquido,
        taxa_total: taxa,
        liquido_pendente_calculo: !r.cortesia && r.status === "pago" && (r.valor_liquido === null || r.valor_liquido === undefined),
      };
    });

    // Totais
    const tot = { bruto: 0, liquido: 0, taxa: 0, qtd: 0, qtd_cortesias: 0 };
    const porEvento: Record<string, { evento_id: string; evento_titulo: string; bruto: number; liquido: number; taxa: number; qtd: number }> = {};
    const porForma: Record<string, { forma: string; bruto: number; liquido: number; taxa: number; qtd: number }> = {};

    for (const r of lista) {
      tot.qtd++;
      if (r.cortesia) tot.qtd_cortesias++;
      tot.bruto += r.valor_bruto;
      tot.liquido += r.valor_liquido;
      tot.taxa += r.taxa_total;

      const ek = r.evento_id;
      porEvento[ek] = porEvento[ek] || { evento_id: ek, evento_titulo: r.evento_titulo, bruto: 0, liquido: 0, taxa: 0, qtd: 0 };
      porEvento[ek].bruto += r.valor_bruto;
      porEvento[ek].liquido += r.valor_liquido;
      porEvento[ek].taxa += r.taxa_total;
      porEvento[ek].qtd++;

      let fk = r.forma_pagamento || "—";
      if (fk === "credit_card" && (r.parcelas || 1) > 1) fk = "credit_card_parcelado";
      porForma[fk] = porForma[fk] || { forma: fk, bruto: 0, liquido: 0, taxa: 0, qtd: 0 };
      porForma[fk].bruto += r.valor_bruto;
      porForma[fk].liquido += r.valor_liquido;
      porForma[fk].taxa += r.taxa_total;
      porForma[fk].qtd++;
    }

    const ticketBase = lista.filter((r) => !r.cortesia && r.status === "pago");
    const ticketMedio = ticketBase.length > 0 ? tot.bruto / ticketBase.length : 0;

    return new Response(JSON.stringify({
      lista,
      totais: {
        ...tot,
        bruto: Number(tot.bruto.toFixed(2)),
        liquido: Number(tot.liquido.toFixed(2)),
        taxa: Number(tot.taxa.toFixed(2)),
        ticket_medio: Number(ticketMedio.toFixed(2)),
        percentual_taxa: tot.bruto > 0 ? Number(((tot.taxa / tot.bruto) * 100).toFixed(2)) : 0,
      },
      por_evento: Object.values(porEvento),
      por_forma: Object.values(porForma),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[relatorio-vendas]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
