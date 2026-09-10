import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { WEBHOOK_TEMPLATES_WA, enviarTemplateWebhook } from "../_shared/whatsapp-webhook.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const payload = await req.json();
  const ok = await enviarTemplateWebhook(payload);
  return new Response(JSON.stringify({ ok, url: WEBHOOK_TEMPLATES_WA }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
