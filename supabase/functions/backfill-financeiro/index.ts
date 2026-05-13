import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputeIngressosFinancials } from "../_shared/financeiro.ts";

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

    // Pega ingressos pagos sem valor_liquido
    const { data: pendentes, error } = await admin
      .from("ingressos")
      .select("id, checkout_id, asaas_payment_id")
      .eq("status", "pago")
      .eq("cortesia", false)
      .is("valor_liquido", null)
      .limit(500);
    if (error) throw error;

    // Agrupa por checkout_id (ou payment_id)
    const grupos = new Map<string, { checkoutId: string | null; paymentId: string | null; ids: string[] }>();
    for (const p of pendentes || []) {
      const key = p.checkout_id || p.asaas_payment_id || p.id;
      if (!grupos.has(key)) {
        grupos.set(key, { checkoutId: p.checkout_id, paymentId: p.asaas_payment_id, ids: [] });
      }
      grupos.get(key)!.ids.push(p.id);
    }

    let processados = 0;
    let erros = 0;
    for (const [, g] of grupos) {
      try {
        await recomputeIngressosFinancials(admin, {
          checkoutId: g.checkoutId,
          paymentId: g.paymentId,
          externalRef: g.ids.join(","),
        });
        processados += g.ids.length;
      } catch (e) {
        console.error("[backfill] erro grupo", g.checkoutId, e);
        erros += g.ids.length;
      }
    }

    return new Response(JSON.stringify({ ok: true, total: pendentes?.length || 0, processados, erros }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[backfill-financeiro]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
