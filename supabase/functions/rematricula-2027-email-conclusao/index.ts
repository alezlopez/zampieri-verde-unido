import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API = "https://api.resend.com/emails";
const TEMPLATE_ID = "fb5ae969-6f3b-4fe4-9fab-6b516994076a";
const FROM = "Colégio Zampieri <noreply@colegiozampieri.com.br>";
const SUBJECT = "Rematrícula 2027 concluída";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY ausente");

    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body?.id_aluno);
    const force = body?.force === true;
    if (!Number.isFinite(idAluno)) return json({ error: "id_aluno_invalido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: aluno, error } = await admin
      .from("alunos_rematricula_2027")
      .select(
        "id_aluno, nome_aluno, curso_2027, turno_escolhido, valor_com_desconto, link_contrato, email_mae, email_pai, rematricula_concluida, email_conclusao_enviado_em",
      )
      .eq("id_aluno", idAluno)
      .maybeSingle();

    if (error) throw error;
    if (!aluno) return json({ error: "aluno_nao_encontrado" }, 404);
    if (!aluno.rematricula_concluida) return json({ ok: true, skipped: "nao_concluida" });
    if (aluno.email_conclusao_enviado_em && !force) {
      return json({ ok: true, skipped: "ja_enviado" });
    }

    const destinatarios = [aluno.email_mae, aluno.email_pai]
      .map((e) => (e || "").trim().toLowerCase())
      .filter((e) => e.includes("@"));
    const to = [...new Set(destinatarios)];
    if (!to.length) return json({ ok: true, skipped: "sem_email" });

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: SUBJECT,
        template: {
          id: TEMPLATE_ID,
          variables: {
            nome_aluno: aluno.nome_aluno ?? "",
            curso_2027: aluno.curso_2027 ?? "",
            turno_escolhido: aluno.turno_escolhido ?? "",
            valor_com_desconto: String(aluno.valor_com_desconto ?? ""),
            link_contrato: aluno.link_contrato ?? "",
          },
        },
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[resend] falha", res.status, JSON.stringify(payload));
      return json({ error: "resend_falhou", status: res.status, detalhe: payload }, res.status);
    }

    await admin
      .from("alunos_rematricula_2027")
      .update({ email_conclusao_enviado_em: new Date().toISOString() })
      .eq("id_aluno", idAluno);

    return json({ ok: true, to, email_id: payload?.id });
  } catch (e) {
    console.error("[rematricula-2027-email-conclusao]", e);
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});
