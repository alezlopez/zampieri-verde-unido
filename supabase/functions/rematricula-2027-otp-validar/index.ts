import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersOtp, hashCodigo } from "../_shared/otp.ts";
import { rematriculaLiberada } from "../_shared/rematricula-abertura.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersOtp });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeadersOtp, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body?.id_aluno);
    const codigo = String(body?.codigo || "").replace(/\D/g, "");
    const finalidade = body?.finalidade === "contato"
      ? "contato"
      : body?.finalidade === "renegociacao"
      ? "renegociacao"
      : "login";
    if (finalidade !== "renegociacao" && !rematriculaLiberada()) {
      return json({ error: "rematricula_nao_liberada" }, 403);
    }

    if (!Number.isFinite(idAluno) || idAluno <= 0 || codigo.length !== 6) {
      return json({ error: "dados_invalidos" }, 400);
    }

    const { data: otp, error } = await supabase
      .from("rematricula_2027_otp")
      .select("*")
      .eq("id_aluno", idAluno)
      .eq("finalidade", finalidade)
      .is("consumido_em", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!otp) return json({ error: "codigo_nao_encontrado" }, 400);

    if (new Date(otp.expira_em).getTime() < Date.now()) {
      return json({ error: "codigo_expirado" }, 400);
    }
    if ((otp.tentativas ?? 0) >= 5) {
      return json({ error: "muitas_tentativas" }, 429);
    }

    const hash = await hashCodigo(codigo, idAluno);
    if (hash !== otp.codigo_hash) {
      await supabase
        .from("rematricula_2027_otp")
        .update({ tentativas: (otp.tentativas ?? 0) + 1 })
        .eq("id", otp.id);
      return json({ error: "codigo_incorreto" }, 400);
    }

    await supabase
      .from("rematricula_2027_otp")
      .update({ consumido_em: new Date().toISOString() })
      .eq("id", otp.id);

    if (finalidade === "contato") {
      return json({ success: true, canal: otp.canal });
    }

    const { data: aluno } = await supabase
      .from("alunos_rematricula_2027")
      .select("data_nascimento_aluno")
      .eq("id_aluno", idAluno)
      .maybeSingle();

    return json({ success: true, data_nascimento: aluno?.data_nascimento_aluno ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("rematricula-2027-otp-validar:", msg);
    return json({ error: "falha_validacao", detalhe: msg }, 502);
  }
});
