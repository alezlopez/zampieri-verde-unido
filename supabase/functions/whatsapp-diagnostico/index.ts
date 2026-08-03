const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async () => {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_OTP");

  if (!token || !phoneId || !templateName) {
    return json({ error: "configuracao_incompleta" }, 500);
  }

  const headers = { Authorization: `Bearer ${token}` };
  const phoneResponse = await fetch(
    `https://graph.facebook.com/v23.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,name_status,throughput,webhook_configuration`,
    { headers },
  );
  const phone = await phoneResponse.json();

  const debugParams = new URLSearchParams({ input_token: token, access_token: token });
  const debugResponse = await fetch(
    `https://graph.facebook.com/v23.0/debug_token?${debugParams}`,
    { headers },
  );
  const debug = await debugResponse.json();
  const granularScopes = Array.isArray(debug?.data?.granular_scopes)
    ? debug.data.granular_scopes
    : [];
  const messagingScope = granularScopes.find(
    (scope: { scope?: string }) => scope.scope === "whatsapp_business_messaging",
  );
  const managementScope = granularScopes.find(
    (scope: { scope?: string }) => scope.scope === "whatsapp_business_management",
  );
  const wabaId = managementScope?.target_ids?.[0] ?? messagingScope?.target_ids?.[0];

  let templates: unknown = null;
  if (wabaId) {
    const params = new URLSearchParams({
      name: templateName,
      fields: "name,status,language,category,components,rejected_reason",
    });
    const templateResponse = await fetch(
      `https://graph.facebook.com/v23.0/${wabaId}/message_templates?${params}`,
      { headers },
    );
    templates = await templateResponse.json();
  }

  return json({
    phone_status: phoneResponse.status,
    phone,
    token_status: debugResponse.status,
    token: {
      is_valid: debug?.data?.is_valid,
      expires_at: debug?.data?.expires_at,
      scopes: debug?.data?.scopes,
      granular_scopes: granularScopes,
    },
    waba_id: wabaId ?? null,
    template_name: templateName,
    templates,
  });
});