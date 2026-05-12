import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Cancela ingressos pendentes há mais de 2 horas, conforme Termo de Compra (cláusula 3).
 * O trigger `atualizar_vagas_disponiveis` libera automaticamente as vagas no UPDATE.
 *
 * Agendado via pg_cron a cada 15 minutos.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin
      .from("ingressos")
      .update({ status: "cancelado" })
      .eq("status", "pendente")
      .lt("created_at", cutoff)
      .select("id, evento_id, created_at");

    if (error) throw error;

    const cancelados = data?.length ?? 0;
    console.log(`[cancelar-pendentes] cancelados=${cancelados} cutoff=${cutoff}`);

    return new Response(
      JSON.stringify({ ok: true, cancelados, cutoff, ingressos: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[cancelar-pendentes]", e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
