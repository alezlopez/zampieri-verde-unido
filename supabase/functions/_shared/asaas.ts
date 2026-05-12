// Helpers para chamar a API do Asaas
const BASE = (Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3").replace(/\/+$/, "");
const KEY = Deno.env.get("ASAAS_API_KEY") || "";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: KEY,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description || json?.error || text || `Asaas ${res.status}`;
    throw new Error(`Asaas ${res.status}: ${msg}`);
  }
  return json;
}

export async function findCustomerByCpf(cpf: string) {
  const cpfClean = cpf.replace(/\D/g, "");
  const data = await call(`/customers?cpfCnpj=${cpfClean}`, { method: "GET" });
  return data?.data?.[0] || null;
}

export async function createCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
}) {
  return await call(`/customers`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      email: input.email,
      mobilePhone: input.mobilePhone?.replace(/\D/g, "") || undefined,
      notificationDisabled: false,
    }),
  });
}

export async function getOrCreateCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
}) {
  const found = await findCustomerByCpf(input.cpfCnpj);
  if (found) return found;
  return await createCustomer(input);
}

export type AsaasBilling = "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";

export async function createPayment(input: {
  customer: string;
  billingType: AsaasBilling;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  totalValue?: number;
}) {
  const body: any = {
    customer: input.customer,
    billingType: input.billingType,
    dueDate: input.dueDate,
    description: input.description,
    externalReference: input.externalReference,
  };
  if (input.installmentCount && input.installmentCount > 1 && input.totalValue) {
    body.installmentCount = input.installmentCount;
    body.totalValue = Number(input.totalValue.toFixed(2));
  } else {
    body.value = Number(input.value.toFixed(2));
  }
  return await call(`/payments`, { method: "POST", body: JSON.stringify(body) });
}

export async function getPayment(paymentId: string) {
  return await call(`/payments/${paymentId}`, { method: "GET" });
}
