// Permite admin sobrescrever (ou limpar) a taxa total de um ingresso ou pedido_produto.
// Quando taxa_manual é definida, recalcula valor_liquido = valor_bruto - taxa_manual.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supaUrl, service);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const tipo = String(body.tipo || ""); // "ingresso" | "pedido"
    const id = String(body.id || "");
    const taxaManualRaw = body.taxa_manual;
    if (!id || (tipo !== "ingresso" && tipo !== "pedido")) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const taxaManual = taxaManualRaw === null || taxaManualRaw === undefined || taxaManualRaw === ""
      ? null
      : Number(taxaManualRaw);
    if (taxaManual !== null && (Number.isNaN(taxaManual) || taxaManual < 0)) {
      return new Response(JSON.stringify({ error: "invalid_taxa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = tipo === "ingresso" ? "ingressos" : "pedidos_produtos";
    const { data: row, error: getErr } = await admin
      .from(table)
      .select("id, valor_bruto, valor_total")
      .eq("id", id)
      .maybeSingle();
    if (getErr || !row) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: any = {
      taxa_manual: taxaManual,
      taxa_manual_em: taxaManual !== null ? new Date().toISOString() : null,
      taxa_manual_por: taxaManual !== null ? userData.user.id : null,
    };

    if (taxaManual !== null) {
      const vb = Number(row.valor_bruto ?? row.valor_total ?? 0);
      update.taxa_total = Number(taxaManual.toFixed(2));
      update.valor_liquido = Number((vb - taxaManual).toFixed(2));
    }
    // Se taxaManual === null, deixa o backfill/recompute repopular os valores reais.

    const { error: upErr } = await admin.from(table).update(update).eq("id", id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, taxa_manual: taxaManual }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
