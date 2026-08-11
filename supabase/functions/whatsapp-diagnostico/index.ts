import { corsHeaders } from "../_shared/cors.ts";

/**
 * Diagnóstico dos templates de WhatsApp aprovados na Meta.
 * Protegido por um segredo simples: header x-diag-key === ZAPSIGN_WEBHOOK_SECRET.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const chave = req.headers.get("x-diag-key") || "";
  if (!chave || chave !== Deno.env.get("ZAPSIGN_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ error: "nao_autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("WHATSAPP_TOKEN");
  const waba = Deno.env.get("WHATSAPP_WABA_ID");
  const res = await fetch(
    `https://graph.facebook.com/v23.0/${waba}/message_templates?limit=100&fields=name,language,status,category,components`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json();
  const resumo = (json?.data ?? []).map((t: any) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    header: (t.components ?? []).find((c: any) => c.type === "HEADER") ?? null,
    body: (t.components ?? []).find((c: any) => c.type === "BODY")?.text ?? null,
    buttons: (t.components ?? []).find((c: any) => c.type === "BUTTONS")?.buttons ?? null,
  }));
  return new Response(JSON.stringify({ status: res.status, erro: json?.error ?? null, resumo }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
