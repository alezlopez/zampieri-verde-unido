import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ZAPSIGN_PRODUCTION_URL = "https://api.zapsign.com.br/api/v1/models/create-doc/";
const TEMPLATE_ID = "bef1f2c6-bd16-458e-8fa7-f8bd0b907f6a";

const brl = (v: unknown) => {
  const n = Number(v);
  if (!isFinite(n) || v === null || v === undefined || v === "") return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const isoToBr = (v: unknown) => {
  const s = String(v ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return s.split("-").reverse().join("/");
};

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const maskCpf = (v: unknown) => {
  const d = digits(v);
  if (d.length !== 11) return String(v ?? "");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const maskCep = (v: unknown) => {
  const d = digits(v);
  if (d.length !== 8) return String(v ?? "");
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const maskTel = (v: unknown) => {
  const d = digits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v ?? "");
};

const ZAPSIGN_SIGN_URL = "https://api.zapsign.com.br/api/v1/sign/";

/**
 * Mapa de assinantes da empresa -> user_token da conta ZapSign.
 * Secret ZAPSIGN_BATCH_USER_TOKENS aceita:
 *  - objeto: { "email@empresa.com": "user_token", "Nome do Signatário": "user_token" }
 *  - array : ["user_token_2", "user_token_3", "user_token_4"] (aplicado aos signatários 2..N na ordem)
 */
const lerMapaUsuarios = (): { mapa: Record<string, string>; lista: string[] } => {
  const raw = Deno.env.get("ZAPSIGN_BATCH_USER_TOKENS");
  if (!raw) return { mapa: {}, lista: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { mapa: {}, lista: parsed.map(String) };
    if (parsed && typeof parsed === "object") {
      const mapa: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) mapa[String(k).trim().toLowerCase()] = String(v);
      return { mapa, lista: [] };
    }
  } catch {
    // valor simples: um único user_token para todos os signatários da empresa
    return { mapa: {}, lista: [raw.trim()] };
  }
  return { mapa: {}, lista: [] };
};

const assinarEmLote = async (apiToken: string, signers: any[]) => {
  const { mapa, lista } = lerMapaUsuarios();
  if (!Object.keys(mapa).length && !lista.length) {
    return { executado: false, motivo: "ZAPSIGN_BATCH_USER_TOKENS não configurado" };
  }

  // Signatários da empresa = todos, menos o primeiro (responsável financeiro)
  const empresa = signers.slice(1);
  const resultados: { signer: string; ok: boolean; detalhe?: unknown }[] = [];

  for (let i = 0; i < empresa.length; i++) {
    const s = empresa[i];
    const chaveEmail = String(s?.email ?? "").trim().toLowerCase();
    const chaveNome = String(s?.name ?? "").trim().toLowerCase();
    const userToken =
      mapa[chaveEmail] ?? mapa[chaveNome] ?? (lista.length === 1 ? lista[0] : lista[i]);

    if (!userToken || !s?.token) {
      resultados.push({ signer: s?.name ?? `#${i + 2}`, ok: false, detalhe: "user_token não mapeado" });
      continue;
    }

    try {
      const r = await fetch(ZAPSIGN_SIGN_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_token: userToken, signer_tokens: [s.token] }),
      });
      const txt = await r.text();
      if (!r.ok) console.error("ZapSign assinar em lote", r.status, txt?.slice(0, 500));
      resultados.push({ signer: s?.name ?? `#${i + 2}`, ok: r.ok, detalhe: r.ok ? undefined : txt?.slice(0, 300) });
    } catch (e) {
      console.error("ZapSign assinar em lote (exceção)", e);
      resultados.push({ signer: s?.name ?? `#${i + 2}`, ok: false, detalhe: String(e) });
    }
  }

  return { executado: true, resultados };
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const token = Deno.env.get("ZAPSIGN_API_TOKEN");
    if (!token) {
      return json({ error: "ZAPSIGN_API_TOKEN não configurado" }, 500);
    }

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

    const { data: a, error } = await supabase
      .from("alunos_rematricula_2027")
      .select("*")
      .eq("id_aluno", idAluno)
      .eq("data_nascimento_aluno", dataNascimento)
      .maybeSingle();

    if (error) return json({ error: "Erro ao consultar aluno" }, 500);
    if (!a) return json({ error: "Aluno não encontrado" }, 404);

    // Contrato já gerado: reaproveita o link salvo (evita documentos duplicados)
    if (a.contrato_gerado && a.link_contrato) {
      return json({
        success: true,
        sign_url: a.link_contrato,
        token: a.zapsign_token ?? null,
        reutilizado: true,
        assinado: !!a.contrato_assinado,
      });
    }

    // Responsável financeiro escolhido no formulário ("mãe" ou "pai")
    const respRaw = String(a.responsavel_financeiro ?? "").toLowerCase();
    const ehMae = respRaw.startsWith("m");
    const p = (base: string) => a[`${base}_${ehMae ? "mae" : "pai"}` as keyof typeof a];

    const nomeResp = String(p("nome") ?? "");
    const emailResp = String(p("email") ?? "");
    const celResp = digits(p("celular"));
    const enderecoResp = [p("logradouro"), p("numero"), p("complemento")]
      .filter((x) => String(x ?? "").trim())
      .join(", ");

    const vars: Record<string, string> = {
      curso_2027: String(a.curso_2027 ?? ""),
      anuidade_total: String(a.anuidade_total ?? ""),
      anuidade_total_ext: String(a.anuidade_total_ext ?? ""),
      valor_pri_parcela: String(a.valor_pri_parcela ?? ""),
      valor_pri_parcela_txt: String(a.valor_pri_parcela_ext ?? ""),
      percentual_desconto: `${Number(a.percentual_desconto ?? 0)}%`,
      percentual_desconto_ext: String(a.percentual_desconto_ext ?? ""),
      dia_vencimento: String(a.dia_vencimento ?? ""),
      valor_com_desconto: brl(a.valor_com_desconto),
      valor_com_desconto_ext: String(a.valor_com_desconto_ext ?? ""),
      data_atual: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),

      responsavel_financeiro: nomeResp,
      cpf_responsavel_financeiro: maskCpf(p("cpf")),
      est_civil_responsavel_financeiro: String(p("estado_civil") ?? ""),
      prof_responsavel_financeiro: "",
      rg_responsavel_financeiro: String(p("rg") ?? ""),
      data_nasc_responsavel_financeiro: isoToBr(p("data_nascimento")),
      nat_responsavel_financeiro: String(p("naturalidade") ?? ""),
      celular_responsavel_financeiro: maskTel(celResp),
      email_responsavel_financeiro: emailResp,
      endereco_res_responsavel_financeiro: enderecoResp,
      bairro_res_responsavel_financeiro: String(p("bairro") ?? ""),
      cidade_res_responsavel_financeiro: [p("cidade"), p("estado")]
        .filter((x) => String(x ?? "").trim())
        .join(" - "),
      cep_res_responsavel_financeiro: maskCep(p("cep")),
      endereco_responsavel_financeiro: enderecoResp,
      bairro_responsavel_financeiro: String(p("bairro") ?? ""),
      cidade_responsavel_financeiro: [p("cidade"), p("estado")]
        .filter((x) => String(x ?? "").trim())
        .join(" - "),
      cep_responsavel_financeiro: maskCep(p("cep")),

      aluno: String(a.nome_aluno ?? ""),
      nome_aluno: String(a.nome_aluno ?? ""),
      data_nasc_aluno: isoToBr(a.data_nascimento_aluno),
      data_nascimento_aluno: isoToBr(a.data_nascimento_aluno),
      id_aluno: String(a.id_aluno ?? ""),
      turno_escolhido: String(a.turno_escolhido ?? ""),

      nome_pai: String(a.nome_pai ?? ""),
      cpf_pai: maskCpf(a.cpf_pai),
      celular_pai: maskTel(a.celular_pai),
      email_pai: String(a.email_pai ?? ""),
      nome_mae: String(a.nome_mae ?? ""),
      cpf_mae: maskCpf(a.cpf_mae),
      celular_mae: maskTel(a.celular_mae),
      email_mae: String(a.email_mae ?? ""),
    };

    const payload = {
      template_id: TEMPLATE_ID,
      name: `[REM] - ${String(a.nome_aluno ?? "").trim()} - ${a.id_aluno}`,
      signer_name: nomeResp || String(a.nome_aluno ?? "Responsável"),
      signer_email: emailResp || undefined,
      signer_phone_country: celResp ? "55" : undefined,
      signer_phone_number: celResp || undefined,
      lang: "pt-br",
      external_id: String(a.id_aluno ?? ""),
      folder_path: "/rematricula-2027/",
      send_automatic_email: false,
      data: Object.entries(vars).map(([de, para]) => ({ de: `{{${de}}}`, para })),
    };


    const resp = await fetch(ZAPSIGN_PRODUCTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();
    let result: any = null;
    try { result = raw ? JSON.parse(raw) : null; } catch { result = null; }
    if (!resp.ok) {
      console.error("ZapSign erro", resp.status, raw?.slice(0, 1000));

      // A ZapSign usa 402 quando a conta de produção não possui o Plano API.
      // Retornamos uma resposta tratável pelo cliente para não transformar uma
      // restrição comercial do provedor em erro interno/502 da aplicação.
      if (resp.status === 402) {
        return json({
          success: false,
          code: "zapsign_plan_required",
          error: "A geração de contratos está temporariamente indisponível.",
          detalhe: "A conta ZapSign de produção precisa ter um Plano API ativo.",
        });
      }

      return json(
        { error: "Falha ao gerar contrato", status: resp.status, detalhe: result ?? raw ?? null },
        502,
      );
    }


    const signers: any[] = Array.isArray(result?.signers) ? result.signers : [];
    const signUrl = signers[0]?.sign_url ?? null;

    await supabase
      .from("alunos_rematricula_2027")
      .update({
        contrato_gerado: true,
        link_contrato: signUrl,
        zapsign_token: result?.token ?? null,
      })
      .eq("id_aluno", idAluno);

    // Assinatura em lote dos signatários da empresa (signatários 2..N do modelo).
    const lote = await assinarEmLote(token, signers);

    return json({ success: true, sign_url: signUrl, token: result?.token ?? null, lote });

  } catch (e) {
    console.error("zapsign-gerar-contrato", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
