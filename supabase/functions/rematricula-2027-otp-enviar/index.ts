import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeadersOtp,
  enviarEmailOtp,
  enviarWhatsappOtp,
  gerarCodigo,
  hashCodigo,
  mascararEmail,
  mascararTelefone,
  onlyDigits,
} from "../_shared/otp.ts";

const CHAVES_VALIDAS = ["celular_mae", "celular_pai", "email_mae", "email_pai"] as const;

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
    const finalidade: string = body?.finalidade === "contato" ? "contato" : "login";
    if (!Number.isFinite(idAluno) || idAluno <= 0) {
      return json({ error: "id_aluno inválido" }, 400);
    }

    const { data: aluno, error: erroAluno } = await supabase
      .from("alunos_rematricula_2027")
      .select("id_aluno, nome_aluno, celular_mae, celular_pai, email_mae, email_pai")
      .eq("id_aluno", idAluno)
      .maybeSingle();

    if (erroAluno) throw erroAluno;
    if (!aluno) return json({ error: "aluno_nao_encontrado" }, 404);

    // Limite: 5 envios por aluno a cada 10 minutos
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rematricula_2027_otp")
      .select("id", { count: "exact", head: true })
      .eq("id_aluno", idAluno)
      .gte("created_at", desde);
    if ((count ?? 0) >= 5) return json({ error: "muitas_tentativas" }, 429);

    let canal: "whatsapp" | "email";
    let destino: string;
    let chave: string | null = null;

    if (finalidade === "login") {
      chave = String(body?.chave || "");
      if (!CHAVES_VALIDAS.includes(chave as (typeof CHAVES_VALIDAS)[number])) {
        return json({ error: "canal_invalido" }, 400);
      }
      canal = chave.startsWith("celular") ? "whatsapp" : "email";
      destino = String((aluno as Record<string, string | null>)[chave] || "").trim();
      if (!destino) return json({ error: "canal_indisponivel" }, 400);
    } else {
      canal = body?.canal === "email" ? "email" : "whatsapp";
      destino = String(body?.destino || "").trim();
      if (canal === "whatsapp") {
        if (onlyDigits(destino).length < 10) return json({ error: "destino_invalido" }, 400);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(destino)) {
        return json({ error: "destino_invalido" }, 400);
      }
    }

    const codigo = gerarCodigo();
    const mascarado = canal === "whatsapp" ? mascararTelefone(destino) : mascararEmail(destino);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;

    const { error: erroInsert } = await supabase.from("rematricula_2027_otp").insert({
      id_aluno: idAluno,
      finalidade,
      canal,
      chave,
      destino_mascarado: mascarado,
      codigo_hash: await hashCodigo(codigo, idAluno),
      expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      ip,
    });
    if (erroInsert) throw erroInsert;

    if (canal === "whatsapp") {
      await enviarWhatsappOtp(destino, codigo);
    } else {
      await enviarEmailOtp(destino, codigo, aluno.nome_aluno ?? "seu filho(a)");
    }

    return json({ success: true, canal, destino_mascarado: mascarado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("rematricula-2027-otp-enviar:", msg);
    return json({ error: "falha_envio", detalhe: msg }, 502);
  }
});
