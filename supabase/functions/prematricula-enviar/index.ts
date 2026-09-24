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

const ANO_LETIVO_REFERENCIA = 2027;
const SERIES = [
  "Infantil 5 (Pré-Escola)",
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "1ª série do Ensino Médio",
  "2ª série do Ensino Médio",
  "3ª série do Ensino Médio",
];

/** Idade completa em 31/03 do ano de referência */
const idadeEm31Marco = (nascIso: string, ano = ANO_LETIVO_REFERENCIA) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascIso)) return null;
  const [a, m, d] = nascIso.split("-").map(Number);
  const corte = new Date(Date.UTC(ano, 2, 31));
  const aniversario = new Date(Date.UTC(ano, m - 1, d));
  let idade = ano - a;
  if (aniversario > corte) idade -= 1;
  return idade;
};

const seriesPermitidas = (nascIso: string) => {
  const idade = idadeEm31Marco(nascIso);
  if (idade === null || idade < 5 || idade >= 18) return [];
  return SERIES.filter((_, i) => i + 5 <= idade);
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
    const admin0 = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const contentType = req.headers.get("content-type") || "";

    // Consulta pelo CPF: existe pré-matrícula aguardando reenvio de documento?
    if (contentType.includes("application/json")) {
      const b = await req.json().catch(() => ({}));
      const acaoJson = String(b?.acao || "");

      // Consulta pelo token do link enviado na mensagem
      if (acaoJson === "consultar_token") {
        const token = txt(b?.t, 120);
        if (token.length < 20) return json({ ok: true, ressalva: null });
        const { data, error } = await admin0
          .from("prematriculas")
          .select("id, aluno_nome, protocolo, status, motivo_codigo, motivo_texto, solucao_texto, ressalva_documento")
          .eq("token", token)
          .eq("status", "aprovado_com_ressalvas")
          .maybeSingle();
        if (error) throw error;
        return json({ ok: true, ressalva: data ?? null });
      }

      if (acaoJson !== "consultar_cpf") return json({ error: "acao_invalida" }, 400);
      const cpf = onlyDigits(txt(b?.cpf, 20));
      if (!cpfValido(cpf)) return json({ error: "cpf_invalido" }, 400);
      const { data, error } = await admin0
        .from("prematriculas")
        .select("id, aluno_nome, protocolo, status, motivo_codigo, motivo_texto, solucao_texto, ressalva_documento")
        .eq("resp_cpf", cpf)
        .eq("status", "aprovado_com_ressalvas")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ ok: true, ressalva: null });
      return json({ ok: true, ressalva: data });
    }

    const form = await req.formData();

    // Reenvio de documento (aprovado com ressalvas)
    if (String(form.get("acao") || "") === "reenviar_documento") {
      const cpf = onlyDigits(txt(form.get("cpf"), 20));
      const pmId = txt(form.get("id"), 60);
      const token = txt(form.get("token"), 120);
      const porToken = token.length >= 20;
      if (!porToken && (!cpfValido(cpf) || !pmId)) return json({ error: "dados_invalidos" }, 400);

      const consulta = admin0
        .from("prematriculas")
        .select("id, resp_cpf, status, ressalva_documento, resp_nome, resp_email, resp_whatsapp, aluno_nome, protocolo");
      const { data: pm, error: erroPm } = await (porToken
        ? consulta.eq("token", token)
        : consulta.eq("id", pmId)
      ).maybeSingle();
      if (erroPm) throw erroPm;
      if (!pm || (!porToken && pm.resp_cpf !== cpf)) return json({ error: "nao_encontrado" }, 404);
      if (pm.status !== "aprovado_com_ressalvas") return json({ error: "status_invalido" }, 400);

      const campo = pm.ressalva_documento === "laudo" ? "laudo" : "boletim";
      const file = form.get("arquivo");
      if (!(file instanceof File) || file.size === 0) return json({ error: "arquivo_ausente" }, 400);
      if (file.size > MAX_BYTES) return json({ error: "arquivo_grande" }, 400);
      if (!TIPOS_OK.includes(file.type)) return json({ error: "arquivo_tipo" }, 400);

      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${pm.id}/${campo}-reenvio-${Date.now()}.${ext}`;
      const { error: erroUp } = await admin0.storage
        .from("prematricula-docs")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (erroUp) throw erroUp;

      const { error: erroUpd } = await admin0
        .from("prematriculas")
        .update({
          [`${campo}_path`]: path,
          status: "reenviado_aguardando_analise",
          reenviado_em: new Date().toISOString(),
        })
        .eq("id", pm.id);
      if (erroUpd) throw erroUpd;

      await notificar("reenvio_recebido", {
        respNome: pm.resp_nome,
        respEmail: pm.resp_email,
        respWhatsapp: pm.resp_whatsapp,
        alunoNome: pm.aluno_nome,
        protocolo: pm.protocolo,
      });

      return json({ ok: true, documento: campo });
    }

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
    // Pré (Infantil 5) só tem turno da tarde
    if (serie === SERIES[0] && turno !== "Tarde") erros.push("turno_preferencia");
    if (d.consentimento_veracidade !== true) erros.push("consentimento_veracidade");
    if (d.consentimento_privacidade !== true) erros.push("consentimento_privacidade");
    if (erros.length) return json({ error: "dados_invalidos", campos: erros }, 400);

    // Corte etário: série precisa ser compatível com a data de nascimento (31/03/2027)
    const permitidas = seriesPermitidas(alunoNasc);
    if (!permitidas.includes(serie)) {
      return json(
        { error: "serie_incompativel", idade: idadeEm31Marco(alunoNasc), permitidas },
        400,
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Uma pré-matrícula ativa por aluno; após reprovação, só com outro responsável (CPF)
    const { data: anteriores, error: erroDup } = await admin
      .from("prematriculas")
      .select("protocolo, created_at, status, resp_cpf")
      .eq("aluno_chave", normNome(alunoNome))
      .eq("aluno_nascimento", alunoNasc);
    if (erroDup) throw erroDup;
    const INATIVOS = ["reprovado", "cancelado", "desistente"];
    const ativa = (anteriores ?? []).find((p) => !INATIVOS.includes(p.status));
    if (ativa) {
      return json(
        { error: "aluno_duplicado", protocolo: ativa.protocolo, criado_em: ativa.created_at },
        409,
      );
    }
    const cpfLimpo = String(respCpf).replace(/\D/g, "");
    if ((anteriores ?? []).some((p) => String(p.resp_cpf ?? "").replace(/\D/g, "") === cpfLimpo)) {
      return json({ error: "responsavel_ja_utilizado" }, 409);
    }

    // 2) WhatsApp e e-mail confirmados por código nos últimos 30 minutos
    const telefone = telefoneE164(respWhats);
    const desde = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const buscarOtp = async (canal: "whatsapp" | "email", destino: string) => {
      const { data, error } = await admin
        .from("prematricula_otp")
        .select("id")
        .eq("canal", canal)
        .eq("destino", destino)
        .not("verificado_em", "is", null)
        .is("consumido_em", null)
        .gte("verificado_em", desde)
        .order("verificado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    const otp = await buscarOtp("whatsapp", telefone);
    if (!otp) return json({ error: "otp_nao_verificado" }, 400);

    const otpEmail = await buscarOtp("email", respEmail);
    if (!otpEmail) return json({ error: "otp_email_nao_verificado" }, 400);

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
      .in("id", [otp.id, otpEmail.id]);

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

    // Disponibilidade da turma para aluno novo (revalidada no servidor)
    let listaEspera = false;
    let cursoTurma: string | null = null;
    try {
      const [{ data: turnos }, { data: cursoMap }] = await Promise.all([
        admin.rpc("prematricula_vagas_turnos", { p_serie: serie }),
        admin.rpc("curso_2027_por_serie", { _serie: serie }),
      ]);
      cursoTurma = (cursoMap as string | null) ?? null;
      const alvo = (turnos as { turno: string; lista_espera: boolean }[] | null)?.find(
        (t) => (t.turno || "").toLowerCase().startsWith(turno.toLowerCase().slice(0, 4)),
      );
      // Sem turma configurada ou turma fechada/lotada => lista de espera
      listaEspera = !alvo || alvo.lista_espera === true;
    } catch (e) {
      console.error("consulta de vagas falhou:", e);
    }

    if (listaEspera) {
      const { error: erroFila } = await admin.from("lista_espera_2027").insert({
        prematricula_id: inserido.id,
        aluno_nome: alunoNome,
        resp_nome: respNome,
        resp_whatsapp: respWhats,
        resp_email: respEmail,
        serie,
        curso_2027: cursoTurma,
        turno,
      });
      if (erroFila) console.error("lista de espera falhou:", erroFila);
    }

    await notificar(listaEspera ? "lista_espera" : "recebida", {
      respNome,
      respEmail,
      respWhatsapp: respWhats,
      alunoNome,
      protocolo: inserido.protocolo,
      curso: cursoTurma,
      turno,
    });

    return json({ ok: true, protocolo: inserido.protocolo, lista_espera: listaEspera });
  } catch (e) {
    console.error("prematricula-enviar erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
