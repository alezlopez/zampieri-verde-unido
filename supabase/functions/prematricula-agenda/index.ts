import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { formatarDataHora, notificar } from "../_shared/prematricula-mensagens.ts";
import { gerarSlots } from "../_shared/prematricula-slots.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const acao = String(body?.acao || "info");
    if (token.length < 20) return json({ error: "token_invalido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pm, error: erroPm } = await admin
      .from("prematriculas")
      .select("id, protocolo, resp_nome, resp_email, resp_whatsapp, aluno_nome, status")
      .eq("token", token)
      .maybeSingle();
    if (erroPm) throw erroPm;
    if (!pm) return json({ error: "token_invalido" }, 404);

    const { data: agAtual } = await admin
      .from("prematricula_agendamentos")
      .select("inicio, fim")
      .eq("prematricula_id", pm.id)
      .eq("status", "agendado")
      .maybeSingle();

    const resumo = {
      protocolo: pm.protocolo,
      aluno_nome: pm.aluno_nome,
      resp_nome: pm.resp_nome,
      status: pm.status,
      agendamento: agAtual
        ? { inicio: agAtual.inicio, texto: formatarDataHora(agAtual.inicio) }
        : null,
      pode_reagendar: pm.status === "entrevista_agendada",
    };

    if (pm.status === "reprovado" || pm.status === "entrevista_concluida") {
      return json({ ok: true, ...resumo, slots: [] });
    }

    const slots = await gerarSlots(admin, pm.id);

    if (acao === "info") return json({ ok: true, ...resumo, slots });

    if (acao === "agendar" || acao === "reagendar") {
      const reagendando = pm.status === "entrevista_agendada";
      if (!reagendando && pm.status !== "aprovado_aguardando_agendamento") {
        return json({ error: "status_invalido", status: pm.status }, 400);
      }
      const inicio = String(body?.inicio || "");
      const escolhido = slots.find((s) => s.inicio === inicio);
      if (!escolhido) return json({ error: "horario_indisponivel" }, 409);

      if (reagendando) {
        await admin
          .from("prematricula_agendamentos")
          .update({ status: "cancelado" })
          .eq("prematricula_id", pm.id)
          .eq("status", "agendado");
      }

      const { error: erroIns } = await admin.from("prematricula_agendamentos").insert({
        prematricula_id: pm.id,
        inicio: escolhido.inicio,
        fim: escolhido.fim,
      });
      if (erroIns) throw erroIns;

      const { error: erroUp } = await admin
        .from("prematriculas")
        .update({ status: "entrevista_agendada", agendado_em: new Date().toISOString() })
        .eq("id", pm.id);
      if (erroUp) throw erroUp;

      await notificar("agendada", {
        respNome: pm.resp_nome,
        respEmail: pm.resp_email,
        respWhatsapp: pm.resp_whatsapp,
        alunoNome: pm.aluno_nome,
        protocolo: pm.protocolo,
        dataEntrevista: escolhido.texto,
      });

      return json({
        ok: true,
        status: "entrevista_agendada",
        agendamento: { inicio: escolhido.inicio, texto: escolhido.texto },
      });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("prematricula-agenda erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
