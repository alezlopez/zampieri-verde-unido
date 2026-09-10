import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const WEBHOOK = "https://n8ncz.colegiozampieri.com.br/webhook/templateswa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const payload = await req.json();
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 2000) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
