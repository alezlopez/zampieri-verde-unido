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
    `https://graph.facebook.com/v23.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,whatsapp_business_account`,
    { headers },
  );
  const phone = await phoneResponse.json();
  const wabaId = phone?.whatsapp_business_account?.id;

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
    template_name: templateName,
    templates,
  });
});