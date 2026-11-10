/**
 * API de Conversões do Meta (CAPI): envia pelo servidor o mesmo Lead que o pixel
 * dispara no navegador. O event_id igual ao eventID do pixel faz o Meta deduplicar.
 */

// Versão estável mais recente da Graph API (confirmada em nov/2026)
const GRAPH_API_VERSION = "v27.0";

export interface MetaLeadParams {
  eventId?: string | null;
  email?: string | null;
  telefone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  pageUrl?: string | null;
  contentName: string;
  segmento: string;
}

const sha256 = async (valor: string) => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Só origin + pathname: a query pode trazer tokens de acesso
const urlSemQuery = (url?: string | null) => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return undefined;
  }
};

const telefoneMeta = (tel: string) => {
  const d = tel.replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};

export async function sendMetaLead(req: Request, params: MetaLeadParams): Promise<void> {
  const token = Deno.env.get("META_CAPI_TOKEN");
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const testCode = Deno.env.get("META_TEST_EVENT_CODE");
  if (!token || !pixelId || !params.eventId) return;

  const email = (params.email || "").replace(/\s+/g, "").toLowerCase();
  const telefone = telefoneMeta(params.telefone || "");

  const userData: Record<string, unknown> = {
    client_user_agent: req.headers.get("user-agent") || undefined,
    client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
  };
  if (email) userData.em = [await sha256(email)];
  if (telefone) userData.ph = [await sha256(telefone)];
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;

  const body: Record<string, unknown> = {
    access_token: token,
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: "website",
        event_source_url: urlSemQuery(params.pageUrl),
        user_data: userData,
        custom_data: { content_name: params.contentName, segmento: params.segmento },
      },
    ],
  };
  if (testCode) body.test_event_code = testCode;

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`meta capi Lead status=${res.status} resposta=${(await res.text()).slice(0, 500)}`);
  }
}
