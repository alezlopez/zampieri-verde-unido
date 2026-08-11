import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { notificar } from "../_shared/prematricula-mensagens.ts";
import { telefoneE164 } from "../_shared/otp.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");
const txt = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

const cpfValido = (cpf: string) => {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
};

const TIPOS_OK = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

/** Mesma normalização do índice único no banco */
const normNome = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const raw = form.get("dados");
    if (typeof raw !== "string") return json({ error: "dados_ausentes" }, 400);
    const d = JSON.parse(raw);

    const erros: string[] = [];
    const respNome = txt(d.resp_nome, 160);
    const respEmail = txt(d.resp_email, 200).toLowerCase();
    const respCpf = onlyDigits(txt(d.resp_cpf, 20));
    const respWhats = onlyDigits(txt(d.resp_whatsapp, 20));
    const alunoNome = txt(d.aluno_nome, 160);
    const alunoNasc = txt(d.aluno_nascimento, 10);
    const serie = txt(d.serie_pretendida, 80);
    const turno = txt(d.turno_preferencia, 20);

    if (respNome.length < 3) erros.push("resp_nome");
    if (
      /\.\./.test(respEmail) ||
      !/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(respEmail)
    )
      erros.push("resp_email");
    if (!cpfValido(respCpf)) erros.push("resp_cpf");
    if (respWhats.length < 10) erros.push("resp_whatsapp");
    if (alunoNome.length < 3) erros.push("aluno_nome");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(alunoNasc)) erros.push("aluno_nascimento");
    if (!serie) erros.push("serie_pretendida");
    if (!turno) erros.push("turno_preferencia");
    if (d.consentimento_veracidade !== true) erros.push("consentimento_veracidade");
    if (d.consentimento_privacidade !== true) erros.push("consentimento_privacidade");
    if (erros.length) return json({ error: "dados_invalidos", campos: erros }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Um aluno, uma pré-matrícula
    const { data: existente, error: erroDup } = await admin
      .from("prematriculas")
      .select("protocolo, created_at")
      .eq("aluno_chave", normNome(alunoNome))
      .eq("aluno_nascimento", alunoNasc)
      .maybeSingle();
    if (erroDup) throw erroDup;
    if (existente) {
      return json(
        {
          error: "aluno_duplicado",
          protocolo: existente.protocolo,
          criado_em: existente.created_at,
        },
        409,
      );
    }

    // 2) WhatsApp confirmado por código nos últimos 30 minutos
    const telefone = telefoneE164(respWhats);
    const desde = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: otp, error: erroOtp } = await admin
      .from("prematricula_otp")
      .select("id")
      .eq("telefone", telefone)
      .not("verificado_em", "is", null)
      .is("consumido_em", null)
      .gte("verificado_em", desde)
      .order("verificado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroOtp) throw erroOtp;
    if (!otp) return json({ error: "otp_nao_verificado" }, 400);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const token_hash = await sha256(token);

    const { data: inserido, error: erroInsert } = await admin
      .from("prematriculas")
      .insert({
        token_hash,
        resp_tipo: txt(d.resp_tipo, 10) || null,
        resp_nome: respNome,
        resp_email: respEmail,
        resp_cpf: respCpf,
        resp_whatsapp: respWhats,
        aluno_nome: alunoNome,
        aluno_nascimento: alunoNasc,
        serie_pretendida: serie,
        turno_preferencia: turno,
        escola_atual: txt(d.escola_atual, 160) || null,
        tipo_escola: txt(d.tipo_escola, 20) || null,
        repetiu_ano: txt(d.repetiu_ano, 20) || null,
        dificuldade_aprendizagem: txt(d.dificuldade_aprendizagem, 20) || null,
        atendimento_complementar: txt(d.atendimento_complementar, 60) || null,
        dificuldade_atencao: txt(d.dificuldade_atencao, 20) || null,
        diagnostico: txt(d.diagnostico, 30) || null,
        diagnostico_detalhe: txt(d.diagnostico_detalhe, 1000) || null,
        dificuldade_socializacao: txt(d.dificuldade_socializacao, 40) || null,
        usa_medicacao: txt(d.usa_medicacao, 20) || null,
        medicacao_detalhe: txt(d.medicacao_detalhe, 1000) || null,
        alergias: txt(d.alergias, 1000) || null,
        observacoes_saude: txt(d.observacoes_saude, 1000) || null,
        consentimento_veracidade: true,
        consentimento_privacidade: true,
      })
      .select("id, protocolo")
      .single();

    if (erroInsert) {
      if ((erroInsert as { code?: string }).code === "23505") {
        return json({ error: "aluno_duplicado" }, 409);
      }
      throw erroInsert;
    }

    await admin
      .from("prematricula_otp")
      .update({ consumido_em: new Date().toISOString() })
      .eq("id", otp.id);

    // Uploads opcionais (boletim e laudo) em bucket privado
    const paths: Record<string, string> = {};
    for (const campo of ["boletim", "laudo"] as const) {
      const file = form.get(campo);
      if (!(file instanceof File) || file.size === 0) continue;
      if (file.size > MAX_BYTES) return json({ error: "arquivo_grande", campo }, 400);
      if (!TIPOS_OK.includes(file.type)) return json({ error: "arquivo_tipo", campo }, 400);
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${inserido.id}/${campo}.${ext}`;
      const { error: erroUp } = await admin.storage
        .from("prematricula-docs")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (erroUp) {
        console.error(`upload ${campo} falhou:`, erroUp);
        continue;
      }
      paths[`${campo}_path`] = path;
    }

    if (Object.keys(paths).length) {
      await admin.from("prematriculas").update(paths).eq("id", inserido.id);
    }

    await notificar("recebida", {
      respNome,
      respEmail,
      respWhatsapp: respWhats,
      alunoNome,
      protocolo: inserido.protocolo,
    });

    return json({ ok: true, protocolo: inserido.protocolo });
  } catch (e) {
    console.error("prematricula-enviar erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
