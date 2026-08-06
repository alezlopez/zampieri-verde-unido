import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { SITE_URL, formatarDataHora, notificar } from "../_shared/prematricula-mensagens.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DESCONTOS = [5, 10, 15, 20, 25, 30];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes, error: erroUser } = await admin.auth.getUser(jwt);
    const user = userRes?.user;
    if (erroUser || !user) return json({ error: "nao_autenticado" }, 401);

    const { data: ehAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "");
    const id = String(body?.id || "");
    if (!id) return json({ error: "id_invalido" }, 400);

    const { data: pm, error: erroPm } = await admin
      .from("prematriculas")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (erroPm) throw erroPm;
    if (!pm) return json({ error: "nao_encontrado" }, 404);

    const base = {
      respNome: pm.resp_nome,
      respEmail: pm.resp_email,
      respWhatsapp: pm.resp_whatsapp,
      alunoNome: pm.aluno_nome,
      protocolo: pm.protocolo,
    };

    if (acao === "aprovar") {
      if (pm.status !== "pendente") return json({ error: "status_invalido" }, 400);
      const token =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "aprovado_aguardando_agendamento",
          aprovado_em: new Date().toISOString(),
          motivo_reprovacao: null,
          token,
        })
        .eq("id", id);
      if (error) throw error;

      await notificar("aprovada", {
        ...base,
        linkAgendamento: `${SITE_URL}/prematricula/agendar?t=${token}`,
      });
      return json({ ok: true, status: "aprovado_aguardando_agendamento" });
    }

    if (acao === "reprovar") {
      if (pm.status !== "pendente") return json({ error: "status_invalido" }, 400);
      const motivo = String(body?.motivo || "").trim().slice(0, 500);
      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "reprovado",
          reprovado_em: new Date().toISOString(),
          motivo_reprovacao: motivo || null,
        })
        .eq("id", id);
      if (error) throw error;

      await notificar("reprovada", { ...base, motivoReprovacao: motivo });
      return json({ ok: true, status: "reprovado" });
    }

    if (acao === "concluir_entrevista") {
      if (pm.status !== "entrevista_agendada") return json({ error: "status_invalido" }, 400);
      const desconto = Number(body?.desconto);
      if (!DESCONTOS.includes(desconto)) return json({ error: "desconto_invalido" }, 400);
      const observacoes = String(body?.observacoes || "").trim().slice(0, 2000);

      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "entrevista_concluida",
          desconto_percentual: desconto,
          observacoes_entrevista: observacoes || null,
          entrevista_concluida_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      await admin
        .from("prematricula_agendamentos")
        .update({ status: "concluido" })
        .eq("prematricula_id", id)
        .eq("status", "agendado");

      await notificar("concluida", { ...base, descontoPercentual: desconto });
      return json({ ok: true, status: "entrevista_concluida" });
    }

    if (acao === "reenviar_link") {
      if (pm.status !== "aprovado_aguardando_agendamento") {
        return json({ error: "status_invalido" }, 400);
      }
      const token =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      if (!pm.token) await admin.from("prematriculas").update({ token }).eq("id", id);
      await notificar("aprovada", {
        ...base,
        linkAgendamento: `${SITE_URL}/prematricula/agendar?t=${token}`,
      });
      return json({ ok: true });
    }

    if (acao === "arquivo_url") {
      const campo = body?.campo === "laudo" ? "laudo_path" : "boletim_path";
      const path = pm[campo];
      if (!path) return json({ error: "sem_arquivo" }, 404);
      const { data, error } = await admin.storage
        .from("prematricula-docs")
        .createSignedUrl(path, 300);
      if (error) throw error;
      return json({ ok: true, url: data.signedUrl });
    }

    if (acao === "cancelar_agendamento") {
      const { data: ag } = await admin
        .from("prematricula_agendamentos")
        .select("inicio")
        .eq("prematricula_id", id)
        .eq("status", "agendado")
        .maybeSingle();
      await admin
        .from("prematricula_agendamentos")
        .update({ status: "cancelado" })
        .eq("prematricula_id", id)
        .eq("status", "agendado");
      await admin
        .from("prematriculas")
        .update({ status: "aprovado_aguardando_agendamento", agendado_em: null })
        .eq("id", id);
      console.log(
        `Agendamento cancelado para ${id}`,
        ag?.inicio ? formatarDataHora(ag.inicio) : "",
      );
      return json({ ok: true, status: "aprovado_aguardando_agendamento" });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("prematricula-admin-acao erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
