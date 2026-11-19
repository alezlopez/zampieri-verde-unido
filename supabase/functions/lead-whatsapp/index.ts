/**
 * Recebe do WhatsZampieri os contatos marcados como "Interessado" (anúncio de clique para WhatsApp,
 * link com código ref, Comercial no menu ou atendente) e os coloca no funil de famílias do site.
 * Autenticação: header X-Webhook-Token = LEAD_CALLBACK_TOKEN (o mesmo que o site usa para chamar o
 * WhatsZampieri; aqui fica no Vault como whatszampieri_lead_token). Aceita um contato ou uma lista.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ORIGENS = ["ctwa_ad", "link", "triage", "manual", "pre_enrollment"];

interface ContatoWa {
  phone?: string;
  name?: string | null;
  source?: string | null;
  source_detail?: Record<string, unknown> | null;
  contact_id?: string | null;
  lead_stage?: string | null;
  lost_reason?: string | null;
  created_at?: string | null;
}

const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** DDD + 8 últimos dígitos: mesma regra de public.chave_telefone (com ou sem o 9º dígito). */
const chave = (fone: string) => {
  const d = fone.replace(/^55(?=\d{10,11}$)/, "");
  return d.length >= 10 ? d.slice(0, 2) + d.slice(-8) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "metodo_invalido" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const token = req.headers.get("x-webhook-token") || "";
    const { data: ok } = await admin.rpc("token_whatszampieri_ok", { p_token: token });
    if (ok !== true) return json({ error: "nao_autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const lista: ContatoWa[] = Array.isArray(body?.contacts) ? body.contacts : [body];
    if (lista.length > 1000) return json({ error: "lista_grande" }, 400);

    const linhas = [];
    for (const c of lista) {
      const fone = digitos(c.phone);
      const k = chave(fone);
      if (!k) continue;
      const origem = ORIGENS.includes(String(c.source)) ? String(c.source) : c.source ? "outro" : "manual";
      // Só os campos úteis da origem (o referral do Meta traz texto do anúncio e IDs)
      const det = c.source_detail ?? {};
      const detalhe = {
        headline: det.headline ?? null,
        source_id: det.source_id ?? null,
        source_type: det.source_type ?? null,
        ref: det.ref ?? null,
        ctwa_clid: det.ctwa_clid ?? null,
      };
      const criado = c.created_at && !Number.isNaN(Date.parse(c.created_at)) ? new Date(c.created_at).toISOString() : new Date().toISOString();
      linhas.push({
        chave: k,
        telefone: fone,
        nome: c.name ? String(c.name).slice(0, 150) : null,
        origem,
        origem_detalhe: detalhe,
        contato_id: c.contact_id ? String(c.contact_id).slice(0, 64) : null,
        etapa_whatsapp: c.lead_stage ? String(c.lead_stage).slice(0, 40) : null,
        motivo_perda: c.lost_reason ? String(c.lost_reason).slice(0, 300) : null,
        primeiro_contato: criado,
      });
    }
    // Mesmo telefone repetido na remessa (com e sem o 9º dígito): fica o registro mais antigo
    const porChave = new Map<string, (typeof linhas)[number]>();
    for (const l of linhas) {
      const atual = porChave.get(l.chave);
      if (!atual || l.primeiro_contato < atual.primeiro_contato) porChave.set(l.chave, l);
    }
    linhas.length = 0;
    linhas.push(...porChave.values());
    if (!linhas.length) return json({ ok: true, gravados: 0 });

    // Reenvio do mesmo contato atualiza nome, etapa e motivo; a origem e o primeiro contato ficam os originais
    const { data: existentes } = await admin
      .from("contatos_whatsapp")
      .select("chave, origem, origem_detalhe, primeiro_contato")
      .in("chave", linhas.map((l) => l.chave));
    const atuais = new Map((existentes ?? []).map((e) => [e.chave, e]));
    const final = linhas.map((l) => {
      const e = atuais.get(l.chave);
      return e
        ? { ...l, origem: e.origem ?? l.origem, origem_detalhe: e.origem ? e.origem_detalhe : l.origem_detalhe, primeiro_contato: e.primeiro_contato }
        : l;
    });

    const { error } = await admin.from("contatos_whatsapp").upsert(final, { onConflict: "chave" });
    if (error) throw error;
    return json({ ok: true, gravados: final.length });
  } catch (e) {
    console.error("lead-whatsapp erro:", (e as Error)?.message ?? e);
    return json({ error: "erro_interno" }, 500);
  }
});
