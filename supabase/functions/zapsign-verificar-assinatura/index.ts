import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Consulta ativamente o status do documento na ZapSign e sincroniza
 * contrato_assinado no banco. Serve de fallback quando o webhook doc_signed
 * não chega (webhook não configurado, falha de entrega, etc).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiToken = Deno.env.get("ZAPSIGN_API_TOKEN");
    if (!apiToken) return json({ error: "ZAPSIGN_API_TOKEN não configurado" }, 500);

    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body?.id_aluno);
    const dataNascimento = String(body?.data_nascimento ?? "").slice(0, 10);
    if (!Number.isFinite(idAluno) || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: a } = await supabase
      .from("alunos_rematricula_2027")
      .select("id_aluno, zapsign_token, link_contrato, contrato_assinado")
      .eq("id_aluno", idAluno)
      .eq("data_nascimento_aluno", dataNascimento)
      .maybeSingle();

    if (!a) return json({ error: "Aluno não encontrado" }, 404);
    if (a.contrato_assinado) return json({ assinado: true, fonte: "banco" });

    // token do documento: coluna zapsign_token ou último trecho do link de verificação
    const docToken =
      a.zapsign_token ||
      (String(a.link_contrato ?? "").match(/([0-9a-f-]{36})/i)?.[1] ?? null);

    if (!docToken) return json({ assinado: false, motivo: "sem_token" });

    const resp = await fetch(`https://api.zapsign.com.br/api/v1/docs/${docToken}/`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const raw = await resp.text();
    if (!resp.ok) {
      console.error("ZapSign consulta doc", resp.status, raw?.slice(0, 500));
      return json({ assinado: false, erro: "consulta_falhou", status: resp.status });
    }

    let doc: any = null;
    try { doc = JSON.parse(raw); } catch { doc = null; }

    const signers: any[] = Array.isArray(doc?.signers) ? doc.signers : [];
    const statusDoc = String(doc?.status ?? "").toLowerCase();

    // Signatário 1 (responsável financeiro) já assinou? -> libera o pagamento
    const respAssinou = String(signers?.[0]?.status ?? "").toLowerCase() === "signed";
    const todosAssinaram =
      signers.length > 0 && signers.every((s) => String(s?.status ?? "").toLowerCase() === "signed");
    const assinado = respAssinou || statusDoc === "signed" || todosAssinaram;

    // Signatários da empresa pendentes: tenta assinar em lote agora
    let lote: unknown = null;
    if (respAssinou && !todosAssinaram) {
      lote = await assinarEmLote(apiToken, signers);
    }

    if (assinado) {
      await supabase
        .from("alunos_rematricula_2027")
        .update({ contrato_assinado: true })
        .eq("id_aluno", idAluno);
    }


    return json({
      assinado,
      status_documento: statusDoc,
      responsavel_assinou: respAssinou,
      signatarios: signers.map((s) => ({ nome: s?.name ?? null, status: s?.status ?? null })),
    });
  } catch (e) {
    console.error("zapsign-verificar-assinatura", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
