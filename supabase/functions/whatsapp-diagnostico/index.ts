import { corsHeaders } from "../_shared/cors.ts";

/** Diagnóstico temporário dos templates de WhatsApp na Meta. */
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, null, 2), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("WHATSAPP_TOKEN")!;
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
  const wabaEnv = Deno.env.get("WHATSAPP_WABA_ID") || "";
  const url = new URL(req.url);
  const wabaParam = url.searchParams.get("waba") || "";

  const get = async (path: string) => {
    const res = await fetch(`https://graph.facebook.com/v23.0/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json() };
  };

  const phone = await get(`${phoneId}?fields=id,display_phone_number,verified_name,quality_rating`);
  const owner = await get(`${phoneId}?fields=id,name_status`);
  const me = await get(`me?fields=id,name`);
  const probes: Record<string, unknown> = {};
  for (const path of [
    "me?fields=assigned_whatsapp_business_accounts{id,name}",
    "me/assigned_whatsapp_business_accounts",
    "me/businesses",
    `${phoneId}?fields=account_mode,is_official_business_account,messaging_limit_tier,platform_type,status`,
  ]) {
    const r = await get(path);
    probes[path] = r.body?.error ? r.body.error.message : r.body;
  }
  const debug = await get(`debug_token?input_token=${token}`);

  let waba = wabaParam || owner.body?.whatsapp_business_account?.id || wabaEnv;
  const templates = waba
    ? await get(`${waba}/message_templates?limit=100&fields=name,language,status,components`)
    : { status: 0, body: null };

  const resumo = (templates.body?.data ?? []).map((t: any) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    header: (t.components ?? []).find((c: any) => c.type === "HEADER") ?? null,
    bodyVars: ((t.components ?? []).find((c: any) => c.type === "BODY")?.text || "").match(/\{\{\d+\}\}/g) ?? [],
    buttons: (t.components ?? []).find((c: any) => c.type === "BUTTONS")?.buttons ?? null,
  }));

  return j({
    wabaEnv,
    wabaUsada: waba,
    phone: phone.body,
    owner: owner.body,
    me: me.body,
    probes,
    debugRaw: debug.body,
    granular: debug.body?.data?.granular_scopes ?? null,
    templatesStatus: templates.status,
    templatesErro: templates.body?.error ?? null,
    resumo,
  });
});
