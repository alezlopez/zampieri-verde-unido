/**
 * Painel: cancelamento de visitas pela secretaria (setor matrícula).
 *  - cancelar: uma visita.
 *  - cancelar_dia: todas as visitas agendadas de uma data (ex.: feriado que não estava bloqueado).
 * Com "avisar", a família recebe no WhatsApp o template "visita_cancelada_u" pedindo para remarcar.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enviarTemplateWebhook } from "../_shared/whatsapp-webhook.ts";
import { formatarDataHora, SITE_URL } from "../_shared/prematricula-mensagens.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TEMPLATE = Deno.env.get("WHATSAPP_TPL_VISITA_CANCELADA") || "visita_cancelada_u";
const HEADER_IMAGE = Deno.env.get("WHATSAPP_HEADER_IMAGE_URL") ||
  `${SITE_URL}/lovable-uploads/bd571e68-1908-4859-81a4-bc2c0c51fa6a.png`;
export const LINK_REMARCAR = `${SITE_URL}/informativomatricula?remarcar=1`;

interface VisitaComLead {
  id: string;
  inicio: string;
  status: string;
  lead: { nome: string; whatsapp: string; serie: string } | null;
}

const primeiroNome = (n: string) => (n || "").trim().split(/\s+/)[0] || "família";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: userRes } = await admin.auth.getUser(jwt);
    const usuario = userRes?.user;
    if (!usuario) return json({ error: "nao_autenticado" }, 401);
    const { data: pode } = await admin.rpc("has_setor", { _user_id: usuario.id, _setor: "matricula" });
    if (!pode) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "");
    const avisar = body?.avisar !== false;
    const motivo = String(body?.motivo || "").trim().slice(0, 200) || null;

    let q = admin.from("visitas").select("id, inicio, status, lead:leads_site(nome, whatsapp, serie)").eq("status", "agendada");
    if (acao === "cancelar") {
      const id = String(body?.visita_id || "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "parametros_invalidos" }, 400);
      q = q.eq("id", id);
    } else if (acao === "cancelar_dia") {
      const data = String(body?.data || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return json({ error: "parametros_invalidos" }, 400);
      q = q.gte("inicio", new Date(`${data}T00:00:00-03:00`).toISOString()).lt("inicio", new Date(`${data}T23:59:59-03:00`).toISOString());
    } else if (acao === "contar_dia") {
      const data = String(body?.data || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return json({ error: "parametros_invalidos" }, 400);
      const { count } = await admin
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("status", "agendada")
        .gte("inicio", new Date(`${data}T00:00:00-03:00`).toISOString())
        .lt("inicio", new Date(`${data}T23:59:59-03:00`).toISOString());
      return json({ ok: true, total: count ?? 0 });
    } else {
      return json({ error: "acao_invalida" }, 400);
    }

    const { data: visitas, error } = await q;
    if (error) throw error;
    const lista = (visitas ?? []) as unknown as VisitaComLead[];
    if (acao === "cancelar" && !lista.length) return json({ error: "visita_nao_encontrada" }, 404);

    const resultado = [];
    for (const v of lista) {
      const { error: upErr } = await admin
        .from("visitas")
        .update({ status: "cancelada", cancelada_em: new Date().toISOString(), cancelada_por: usuario.id, motivo_cancelamento: motivo })
        .eq("id", v.id)
        .eq("status", "agendada");
      if (upErr) throw upErr;

      let enviado = false;
      if (avisar && v.lead?.whatsapp) {
        const nome = primeiroNome(v.lead.nome);
        const quando = formatarDataHora(v.inicio);
        enviado = await enviarTemplateWebhook({
          evento: "visita_cancelada",
          origem: "visita",
          template: TEMPLATE,
          template_utility: TEMPLATE,
          template_fallback: null,
          language: Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "pt_BR",
          to: `55${v.lead.whatsapp}`,
          telefone_original: v.lead.whatsapp,
          params: [nome, quando],
          body_params: { "1": nome, "2": quando },
          button_url_param: null,
          link: LINK_REMARCAR,
          header_image_url: HEADER_IMAGE,
          dados: { primeiro_nome_responsavel: nome, data_visita: quando, serie: v.lead.serie, motivo },
          enviado_em: new Date().toISOString(),
        });
        if (enviado) await admin.from("visitas").update({ aviso_enviado_em: new Date().toISOString() }).eq("id", v.id);
      }
      resultado.push({ id: v.id, inicio: v.inicio, nome: v.lead?.nome ?? null, whatsapp: v.lead?.whatsapp ?? null, serie: v.lead?.serie ?? null, aviso_enviado: enviado });
    }

    return json({ ok: true, canceladas: resultado, link_remarcar: LINK_REMARCAR });
  } catch (e) {
    console.error("admin-visitas erro:", (e as Error)?.message ?? e);
    return json({ error: "erro_interno" }, 500);
  }
});
