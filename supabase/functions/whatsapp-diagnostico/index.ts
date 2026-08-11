import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const waba = Deno.env.get("WHATSAPP_WABA_ID");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const out: Record<string, unknown> = { waba, phoneId, temToken: !!token };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${waba}/message_templates?limit=50&fields=name,language,status,category,quality_score`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const j = await r.json();
    out.templates = (j?.data ?? []).map((t: any) => ({
      name: t.name,
      lang: t.language,
      status: t.status,
      category: t.category,
      quality: t.quality_score?.score ?? null,
    }));
    out.templatesErro = j?.error ?? null;
  } catch (e) {
    out.templatesErro = String(e);
  }

  try {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${phoneId}?fields=display_phone_number,quality_rating,throughput,messaging_limit_tier,name_status,status`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    out.numero = await r.json();
  } catch (e) {
    out.numeroErro = String(e);
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
