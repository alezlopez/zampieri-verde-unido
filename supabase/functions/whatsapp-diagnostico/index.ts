import { corsHeaders } from "../_shared/cors.ts";

/**
 * Diagnóstico + manutenção dos templates do WhatsApp.
 *
 * GET  -> lista templates (nome, status, categoria) e a saúde do número.
 * POST { acao: "recategorizar" } -> pede à Meta para mover os templates
 * transacionais da matrícula de MARKETING para UTILITY (mensagens de
 * MARKETING não são entregues a quem optou por não receber promoções).
 */

const TRANSACIONAIS = [
  "prematricula_recebida",
  "prematricula_aprovadav2",
  "prematricula_reprovada",
  "prematricula_agendada",
  "prematricula_entrevista_concluida",
  "matricula_documentos_reenvio",
  "matricula_dados_liberados",
];

const graph = (path: string, token: string, init?: RequestInit) =>
  fetch(`https://graph.facebook.com/v23.0/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("WHATSAPP_TOKEN")!;
  const waba = Deno.env.get("WHATSAPP_WABA_ID")!;
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
  const out: Record<string, unknown> = { waba, phoneId, temToken: !!token };

  const listaRes = await graph(
    `${waba}/message_templates?limit=100&fields=id,name,language,status,category`,
    token,
  );
  const lista = await listaRes.json();
  const templates: any[] = lista?.data ?? [];
  out.templatesErro = lista?.error ?? null;
  out.templates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    lang: t.language,
    status: t.status,
    category: t.category,
  }));

  const numRes = await graph(
    `${phoneId}?fields=display_phone_number,quality_rating,messaging_limit_tier,name_status,status`,
    token,
  );
  out.numero = await numRes.json();

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body?.acao === "recategorizar") {
      const resultados: unknown[] = [];
      for (const t of templates) {
        if (!TRANSACIONAIS.includes(t.name) || t.category === "UTILITY") continue;
        const r = await graph(`${t.id}`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "UTILITY" }),
        });
        const j = await r.json();
        resultados.push({ name: t.name, status: r.status, resposta: j });
        console.log(`Recategorizar ${t.name} -> UTILITY status=${r.status} ${JSON.stringify(j)}`);
      }
      out.recategorizacao = resultados;
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
