import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("ZAPSIGN_WEBHOOK_SECRET");
    if (secret) {
      const url = new URL(req.url);
      const provided =
        url.searchParams.get("secret") ??
        req.headers.get("x-webhook-secret") ??
        "";
      if (provided !== secret) return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => null);
    if (!payload) return json({ error: "Invalid payload" }, 400);

    const event = String(payload?.event_type ?? payload?.status ?? "").toLowerCase();
    console.log("zapsign-webhook event", event, JSON.stringify(payload)?.slice(0, 1500));

    const isSigned = event.includes("signed") || event === "doc_signed";
    if (!isSigned) return json({ ok: true, ignored: event });

    const externalId = payload?.external_id ?? payload?.doc?.external_id ?? null;
    const idAluno = Number(externalId);
    if (!externalId || Number.isNaN(idAluno)) {
      console.error("zapsign-webhook sem external_id valido", externalId);
      return json({ ok: true, warning: "external_id ausente" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("alunos_rematricula_2027")
      .update({ contrato_assinado: true })
      .eq("id_aluno", idAluno);

    if (error) {
      console.error("zapsign-webhook update erro", error);
      return json({ error: "Falha ao atualizar" }, 500);
    }

    return json({ ok: true, id_aluno: idAluno });
  } catch (e) {
    console.error("zapsign-webhook", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
