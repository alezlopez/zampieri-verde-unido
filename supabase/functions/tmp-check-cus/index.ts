Deno.serve(async () => {
  const BASE = (Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3").replace(/\/+$/, "");
  const r = await fetch(`${BASE}/customers/cus_000182802269`, { headers: { access_token: Deno.env.get("ASAAS_API_KEY")! } });
  const j = await r.json();
  return new Response(JSON.stringify({ status: r.status, deleted: j.deleted, email: j.email, name: j.name, cpf: j.cpfCnpj?.slice(-3) }));
});
