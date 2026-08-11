import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { concluirMatriculaGratuita } from "../_shared/matricula-contrato.ts";
import { notificar } from "../_shared/prematricula-mensagens.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Webhook do ZapSign.
 * Segurança: o payload NUNCA é confiado por si só. Antes de marcar o contrato
 * como assinado, o documento é reconsultado na API do ZapSign (pelo token) e
 * o external_id / token precisa bater com o registro do aluno no banco.
 * Opcionalmente, um segredo compartilhado (ZAPSIGN_WEBHOOK_SECRET) pode ser
 * exigido via ?secret= ou header x-webhook-secret.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("ZAPSIGN_WEBHOOK_SECRET");
    if (secret) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
      if (provided !== secret) return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => null);
    if (!payload) return json({ error: "Invalid payload" }, 400);

    const event = String(payload?.event_type ?? payload?.status ?? "").toLowerCase();
    console.log("zapsign-webhook event", event);

    const isSigned = event.includes("signed") || event === "doc_signed";
    if (!isSigned) return json({ ok: true, ignored: event });

    const docToken = String(payload?.token ?? payload?.doc?.token ?? "").trim();
    const externalId = payload?.external_id ?? payload?.doc?.external_id ?? null;
    const idAluno = Number(externalId);

    if (!docToken && (!externalId || Number.isNaN(idAluno))) {
      console.error("zapsign-webhook sem token/external_id");
      return json({ ok: true, warning: "identificacao ausente" });
    }

    const apiToken = Deno.env.get("ZAPSIGN_API_TOKEN");
    if (!apiToken) return json({ error: "ZAPSIGN_API_TOKEN não configurado" }, 500);

    // 1) Reconsulta o documento na fonte oficial (não confia no corpo recebido)
    if (!docToken) {
      console.error("zapsign-webhook payload sem token do documento");
      return json({ ok: true, warning: "token ausente" });
    }

    const resp = await fetch(`https://api.zapsign.com.br/api/v1/docs/${docToken}/`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const texto = await resp.text();
    if (!resp.ok) {
      console.error("zapsign-webhook falha ao consultar doc", resp.status, texto.slice(0, 400));
      return json({ error: "Falha ao validar documento" }, 502);
    }

    let doc: any = null;
    try {
      doc = JSON.parse(texto);
    } catch {
      return json({ error: "Resposta inválida do ZapSign" }, 502);
    }

    const signers: any[] = Array.isArray(doc?.signers) ? doc.signers : [];
    const responsavelAssinou = String(signers[0]?.status ?? "").toLowerCase() === "signed";
    if (!responsavelAssinou) {
      return json({ ok: true, ignored: "responsavel_nao_assinou" });
    }

    const externalReal = String(doc?.external_id ?? externalId ?? "");

    // Contratos de matrícula usam external_id no formato "mat:<uuid>"
    if (externalReal.startsWith("mat:")) {
      const matId = externalReal.slice(4);
      const supabaseMat = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data: mat } = await supabaseMat
        .from("matriculas")
        .select("*")
        .eq("id", matId)
        .maybeSingle();
      if (!mat) return json({ ok: true, warning: "matricula nao encontrada" });
      if (mat.zapsign_token && mat.zapsign_token !== docToken) {
        return json({ error: "Documento não corresponde à matrícula" }, 403);
      }
      await supabaseMat
        .from("matriculas")
        .update({
          contrato_assinado: true,
          contrato_assinado_em: new Date().toISOString(),
          status: "contrato_assinado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matId);
      // Matrícula isenta: conclui na hora, sem cobrança.
      if (mat.matricula_gratuita) {
        mat.contrato_assinado = true;
        mat.status = "contrato_assinado";
        await concluirMatriculaGratuita(supabaseMat, mat, notificar);
      }
      return json({ ok: true, matricula_id: matId });
    }

    const idReal = Number(externalReal);
    if (!Number.isFinite(idReal)) {
      return json({ ok: true, warning: "external_id invalido" });
    }


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 2) O token do documento precisa bater com o registrado para o aluno
    const { data: aluno } = await supabase
      .from("alunos_rematricula_2027")
      .select("id_aluno, zapsign_token")
      .eq("id_aluno", idReal)
      .maybeSingle();

    if (!aluno) return json({ ok: true, warning: "aluno nao encontrado" });
    if (aluno.zapsign_token && aluno.zapsign_token !== docToken) {
      console.error("zapsign-webhook token divergente para aluno", idReal);
      return json({ error: "Documento não corresponde ao aluno" }, 403);
    }

    const { error } = await supabase
      .from("alunos_rematricula_2027")
      .update({ contrato_assinado: true, updated_at: new Date().toISOString() })
      .eq("id_aluno", idReal);

    if (error) {
      console.error("zapsign-webhook update erro", error);
      return json({ error: "Falha ao atualizar" }, 500);
    }

    return json({ ok: true, id_aluno: idReal });
  } catch (e) {
    console.error("zapsign-webhook", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
