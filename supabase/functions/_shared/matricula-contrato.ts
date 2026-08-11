import { assinarEmLote } from "./zapsign-lote.ts";

const ZAPSIGN_URL = "https://api.zapsign.com.br/api/v1/models/create-doc/";
const TEMPLATE_ID = "bef1f2c6-bd16-458e-8fa7-f8bd0b907f6a";

export const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export const brl = (v: unknown) => {
  const n = Number(v);
  return isFinite(n) && v !== null && v !== "" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
};

export const isoToBr = (v: unknown) => {
  const s = String(v ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : "";
};

export const maskCpf = (v: unknown) => {
  const d = digits(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(v ?? "");
};

export const maskCep = (v: unknown) => {
  const d = digits(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(v ?? "");
};

export const maskTel = (v: unknown) => {
  const d = digits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v ?? "");
};

/** Campos financeiros mínimos para o contrato fazer sentido. */
export const valoresProntos = (mat: Record<string, unknown>) =>
  !!String(mat.anuidade_total ?? "").trim() &&
  !!String(mat.valor_com_desconto ?? "").trim() &&
  (!!mat.matricula_gratuita || Number(mat.valor_matricula) > 0) &&
  !!Number(mat.dia_vencimento);

/**
 * Matrícula isenta: conclui automaticamente assim que o contrato é assinado.
 * Idempotente — não repete a notificação se já estiver concluída.
 */
export const concluirMatriculaGratuita = async (
  admin: any,
  mat: Record<string, any>,
  notificar?: (evento: string, dados: Record<string, unknown>) => Promise<unknown>,
) => {
  if (!mat?.matricula_gratuita) return { concluida: false, motivo: "nao_gratuita" };
  if (!mat.contrato_assinado) return { concluida: false, motivo: "contrato_nao_assinado" };
  if (mat.status === "concluida" || mat.concluida_em) return { concluida: true, ja_estava: true };

  const agora = new Date().toISOString();
  await admin.from("matriculas").update({
    status: "concluida",
    concluida_em: agora,
    data_pagamento: agora,
    valor_pago: 0,
    forma_pagamento: "isento",
    updated_at: agora,
  }).eq("id", mat.id);

  mat.status = "concluida";
  mat.concluida_em = agora;

  if (notificar) {
    try {
      const { data: pm } = await admin
        .from("prematriculas")
        .select("protocolo, resp_nome, resp_email, resp_whatsapp, aluno_nome")
        .eq("id", mat.prematricula_id)
        .maybeSingle();
      await notificar("matricula_concluida", {
        respNome: mat.resp_fin_nome || pm?.resp_nome || "",
        respEmail: mat.resp_fin_email || pm?.resp_email || "",
        respWhatsapp: mat.resp_fin_celular || pm?.resp_whatsapp || "",
        alunoNome: mat.nome_aluno || pm?.aluno_nome || "",
        protocolo: pm?.protocolo || "",
      });
    } catch (e) {
      console.error("notificar matricula_concluida (isenta)", e);
    }
  }
  return { concluida: true };
};

type Resultado =
  | { ok: true; sign_url: string | null; reutilizado?: boolean }
  | { ok: false; error: string; detalhe?: string; status: number };

/** Gera o contrato no ZapSign e persiste o link na matrícula. */
export const gerarContrato = async (
  admin: any,
  mat: Record<string, any>,
  pm: Record<string, any> | null,
  redirectUrl?: string,
): Promise<Resultado> => {
  if (mat.contrato_gerado && mat.link_contrato) {
    return { ok: true, reutilizado: true, sign_url: mat.link_contrato };
  }

  const zapToken = Deno.env.get("ZAPSIGN_API_TOKEN");
  if (!zapToken) return { ok: false, error: "zapsign_nao_configurado", status: 500 };
  if (!mat.resp_fin_nome || digits(mat.resp_fin_cpf).length !== 11) {
    return { ok: false, error: "responsavel_incompleto", status: 400 };
  }
  if (!valoresProntos(mat)) return { ok: false, error: "valores_pendentes", status: 400 };

  const endereco = [mat.logradouro, mat.numero, mat.complemento]
    .filter((x) => String(x ?? "").trim()).join(", ");
  const cidadeUf = [mat.cidade, mat.estado].filter((x) => String(x ?? "").trim()).join(" - ");

  const vars: Record<string, string> = {
    curso_2027: String(mat.curso ?? ""),
    anuidade_total: String(mat.anuidade_total ?? ""),
    anuidade_total_ext: String(mat.anuidade_total_ext ?? ""),
    valor_pri_parcela: String(mat.valor_pri_parcela ?? ""),
    valor_pri_parcela_txt: String(mat.valor_pri_parcela_ext ?? ""),
    percentual_desconto: `${Number(mat.percentual_desconto ?? 0)}%`,
    percentual_desconto_ext: String(mat.percentual_desconto_ext ?? ""),
    dia_vencimento: String(mat.dia_vencimento ?? ""),
    valor_com_desconto: brl(mat.valor_com_desconto),
    valor_com_desconto_ext: String(mat.valor_com_desconto_ext ?? ""),
    data_atual: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),

    responsavel_financeiro: String(mat.resp_fin_nome ?? ""),
    cpf_responsavel_financeiro: maskCpf(mat.resp_fin_cpf),
    est_civil_responsavel_financeiro: String(mat.resp_fin_estado_civil ?? ""),
    prof_responsavel_financeiro: String(mat.resp_fin_profissao ?? ""),
    rg_responsavel_financeiro: String(mat.resp_fin_rg ?? ""),
    data_nasc_responsavel_financeiro: isoToBr(mat.resp_fin_data_nascimento),
    nat_responsavel_financeiro: String(mat.resp_fin_naturalidade ?? ""),
    celular_responsavel_financeiro: maskTel(mat.resp_fin_celular),
    email_responsavel_financeiro: String(mat.resp_fin_email ?? ""),
    endereco_res_responsavel_financeiro: endereco,
    bairro_res_responsavel_financeiro: String(mat.bairro ?? ""),
    cidade_res_responsavel_financeiro: cidadeUf,
    cep_res_responsavel_financeiro: maskCep(mat.cep),
    endereco_responsavel_financeiro: endereco,
    bairro_responsavel_financeiro: String(mat.bairro ?? ""),
    cidade_responsavel_financeiro: cidadeUf,
    cep_responsavel_financeiro: maskCep(mat.cep),

    aluno: String(mat.nome_aluno ?? ""),
    nome_aluno: String(mat.nome_aluno ?? ""),
    data_nasc_aluno: isoToBr(mat.data_nascimento_aluno),
    data_nascimento_aluno: isoToBr(mat.data_nascimento_aluno),
    id_aluno: String(pm?.protocolo ?? ""),
    turno_escolhido: String(mat.turno ?? ""),

    nome_pai: String(mat.nome_pai ?? ""),
    cpf_pai: maskCpf(mat.cpf_pai),
    celular_pai: maskTel(mat.celular_pai),
    email_pai: String(mat.email_pai ?? ""),
    nome_mae: String(mat.nome_mae ?? ""),
    cpf_mae: maskCpf(mat.cpf_mae),
    celular_mae: maskTel(mat.celular_mae),
    email_mae: String(mat.email_mae ?? ""),
  };

  const celResp = digits(mat.resp_fin_celular);
  const payload = {
    template_id: TEMPLATE_ID,
    name: `[MAT] - ${String(mat.nome_aluno ?? "").trim()} - Contrato`,
    signer_name: String(mat.resp_fin_nome ?? "Responsável"),
    signer_email: String(mat.resp_fin_email ?? "") || undefined,
    signer_phone_country: celResp ? "55" : undefined,
    signer_phone_number: celResp || undefined,
    lang: "pt-br",
    external_id: `mat:${mat.id}`,
    folder_path: "/matriculas/",
    send_automatic_email: false,
    redirect_link: redirectUrl || undefined,
    data: Object.entries(vars).map(([de, para]) => ({ de: `{{${de}}}`, para })),
  };

  const resp = await fetch(ZAPSIGN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${zapToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await resp.text();
  if (!resp.ok) {
    console.error("ZapSign matrícula erro", resp.status, raw.slice(0, 800));
    return { ok: false, error: "falha_contrato", detalhe: raw.slice(0, 300), status: 502 };
  }
  const result = JSON.parse(raw);
  const signers: any[] = Array.isArray(result?.signers) ? result.signers : [];
  const signUrl = signers[0]?.sign_url ?? null;

  await admin.from("matriculas").update({
    contrato_gerado: true,
    contrato_gerado_em: new Date().toISOString(),
    link_contrato: signUrl,
    zapsign_token: result?.token ?? null,
    status: "contrato_gerado",
    updated_at: new Date().toISOString(),
  }).eq("id", mat.id);

  mat.contrato_gerado = true;
  mat.link_contrato = signUrl;
  mat.status = "contrato_gerado";

  await assinarEmLote(zapToken, signers).catch((e) => console.error("assinarEmLote", e));

  return { ok: true, sign_url: signUrl };
};

/**
 * Consulta ativamente o documento na ZapSign e sincroniza contrato_assinado.
 * Fallback para quando o webhook doc_signed não chega.
 */
export const verificarAssinatura = async (admin: any, mat: Record<string, any>) => {
  if (mat.contrato_assinado) return { assinado: true, fonte: "banco" };
  const apiToken = Deno.env.get("ZAPSIGN_API_TOKEN");
  if (!apiToken) return { assinado: false, motivo: "zapsign_nao_configurado" };

  const docToken =
    mat.zapsign_token ||
    (String(mat.link_contrato ?? "").match(/([0-9a-f-]{36})/i)?.[1] ?? null);
  if (!docToken) return { assinado: false, motivo: "sem_token" };

  const resp = await fetch(`https://api.zapsign.com.br/api/v1/docs/${docToken}/`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const raw = await resp.text();
  if (!resp.ok) {
    console.error("ZapSign consulta doc (matrícula)", resp.status, raw.slice(0, 500));
    return { assinado: false, motivo: "consulta_falhou" };
  }
  let doc: any = null;
  try { doc = JSON.parse(raw); } catch { doc = null; }

  const signers: any[] = Array.isArray(doc?.signers) ? doc.signers : [];
  const statusDoc = String(doc?.status ?? "").toLowerCase();
  const respAssinou = String(signers?.[0]?.status ?? "").toLowerCase() === "signed";
  const todosAssinaram =
    signers.length > 0 && signers.every((s) => String(s?.status ?? "").toLowerCase() === "signed");
  const assinado = respAssinou || statusDoc === "signed" || todosAssinaram;

  if (respAssinou && !todosAssinaram) {
    await assinarEmLote(apiToken, signers).catch((e) => console.error("assinarEmLote", e));
  }

  if (assinado) {
    await admin.from("matriculas").update({
      contrato_assinado: true,
      contrato_assinado_em: new Date().toISOString(),
      status: "contrato_assinado",
      updated_at: new Date().toISOString(),
    }).eq("id", mat.id);
    mat.contrato_assinado = true;
    mat.status = "contrato_assinado";
  }
  return { assinado, status_documento: statusDoc };
};
