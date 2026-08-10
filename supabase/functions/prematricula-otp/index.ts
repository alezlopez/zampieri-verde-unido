import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { enviarWhatsappOtp, gerarCodigo, onlyDigits, telefoneE164 } from "../_shared/otp.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const txt = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

async function hashCodigo(codigo: string, telefone: string) {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "sem-pepper";
  const data = new TextEncoder().encode(`${telefone}:${codigo}:${pepper}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mesma normalização do índice único no banco */
const normNome = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const acao = txt(body?.acao, 20);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

    // ---- Checagem de duplicidade do aluno ----
    if (acao === "checar_aluno") {
      const nome = txt(body?.aluno_nome, 160);
      const nasc = txt(body?.aluno_nascimento, 10);
      if (nome.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(nasc)) {
        return json({ error: "dados_invalidos" }, 400);
      }
      const { data, error } = await admin
        .from("prematriculas")
        .select("protocolo, created_at")
        .eq("aluno_chave", normNome(nome))
        .eq("aluno_nascimento", nasc)
        .maybeSingle();
      if (error) throw error;
      return json({
        ok: true,
        existe: !!data,
        protocolo: data?.protocolo ?? null,
        criado_em: data?.created_at ?? null,
      });
    }

    // ---- Envio do código ----
    if (acao === "enviar") {
      const telefone = telefoneE164(onlyDigits(txt(body?.telefone, 20)));
      if (telefone.length < 12) return json({ error: "telefone_invalido" }, 400);

      const { data: liberado } = await admin.rpc("rematricula_2027_rate_hit", {
        p_bucket: "prematricula_otp",
        p_limite: 10,
        p_janela_seg: 600,
      });
      if (liberado === false) return json({ error: "muitas_tentativas" }, 429);

      // limite por número: 5 envios em 30 minutos
      const desde = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("prematricula_otp")
        .select("id", { count: "exact", head: true })
        .eq("telefone", telefone)
        .gte("created_at", desde);
      if ((count ?? 0) >= 5) return json({ error: "muitas_tentativas" }, 429);

      const codigo = gerarCodigo();
      const codigo_hash = await hashCodigo(codigo, telefone);
      const { error: erroIns } = await admin.from("prematricula_otp").insert({
        telefone,
        codigo_hash,
        expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        ip,
      });
      if (erroIns) throw erroIns;

      try {
        await enviarWhatsappOtp(telefone, codigo);
      } catch (e) {
        console.error("prematricula-otp envio falhou:", e);
        return json({ error: "envio_falhou" }, 502);
      }
      return json({ ok: true });
    }

    // ---- Validação do código ----
    if (acao === "validar") {
      const telefone = telefoneE164(onlyDigits(txt(body?.telefone, 20)));
      const codigo = onlyDigits(txt(body?.codigo, 10));
      if (telefone.length < 12 || codigo.length !== 6) {
        return json({ error: "dados_invalidos" }, 400);
      }

      const { data: reg, error } = await admin
        .from("prematricula_otp")
        .select("id, codigo_hash, expira_em, tentativas, consumido_em")
        .eq("telefone", telefone)
        .is("consumido_em", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!reg) return json({ error: "codigo_nao_encontrado" }, 400);
      if (new Date(reg.expira_em).getTime() < Date.now()) {
        return json({ error: "codigo_expirado" }, 400);
      }
      if ((reg.tentativas ?? 0) >= 5) return json({ error: "muitas_tentativas" }, 429);

      const esperado = await hashCodigo(codigo, telefone);
      if (esperado !== reg.codigo_hash) {
        await admin
          .from("prematricula_otp")
          .update({ tentativas: (reg.tentativas ?? 0) + 1 })
          .eq("id", reg.id);
        return json({ error: "codigo_invalido" }, 400);
      }

      await admin
        .from("prematricula_otp")
        .update({ verificado_em: new Date().toISOString() })
        .eq("id", reg.id);
      return json({ ok: true, verificado: true });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("prematricula-otp erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
