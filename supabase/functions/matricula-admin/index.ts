import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { DOCUMENTOS, TIPOS_VALIDOS, labelDoc } from "../_shared/matricula-docs.ts";
import { SITE_URL, notificar } from "../_shared/prematricula-mensagens.ts";
import { assinarEmLote } from "../_shared/zapsign-lote.ts";

const ZAPSIGN_URL = "https://api.zapsign.com.br/api/v1/models/create-doc/";
const TEMPLATE_ID = "bef1f2c6-bd16-458e-8fa7-f8bd0b907f6a";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const brl = (v: unknown) => {
  const n = Number(v);
  return isFinite(n) && v !== null && v !== "" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
};
const isoToBr = (v: unknown) => {
  const s = String(v ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : "";
};
const maskCpf = (v: unknown) => {
  const d = digits(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(v ?? "");
};
const maskCep = (v: unknown) => {
  const d = digits(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(v ?? "");
};
const maskTel = (v: unknown) => {
  const d = digits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v ?? "");
};

const CAMPOS_EDITAVEIS = [
  "resp_fin_quem", "resp_fin_nome", "resp_fin_cpf", "resp_fin_rg", "resp_fin_estado_civil",
  "resp_fin_naturalidade", "resp_fin_nacionalidade", "resp_fin_profissao",
  "resp_fin_data_nascimento", "resp_fin_celular", "resp_fin_email",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado",
  "nome_pai", "cpf_pai", "celular_pai", "email_pai",
  "nome_mae", "cpf_mae", "celular_mae", "email_mae",
  "nome_aluno", "data_nascimento_aluno", "curso", "turno",
  "anuidade_total", "anuidade_total_ext", "percentual_desconto", "percentual_desconto_ext",
  "valor_com_desconto", "valor_com_desconto_ext", "valor_pri_parcela", "valor_pri_parcela_ext",
  "dia_vencimento", "valor_matricula", "permite_avista", "permite_parcelado", "max_parcelas",
];

const NUMERICOS = ["percentual_desconto", "valor_com_desconto", "valor_matricula"];
const INTEIROS = ["dia_vencimento", "max_parcelas"];
const BOOLEANOS = ["permite_avista", "permite_parcelado"];
const DATAS = ["resp_fin_data_nascimento", "data_nascimento_aluno"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userRes } = await admin.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "nao_autenticado" }, 401);
    const { data: ehAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "listar");

    if (acao === "listar") {
      const { data: mats } = await admin
        .from("matriculas")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = (mats ?? []).map((m) => m.prematricula_id);
      const { data: pms } = await admin
        .from("prematriculas")
        .select("id, protocolo, resp_nome, resp_email, resp_cpf, resp_whatsapp, aluno_nome, aluno_nascimento, serie_pretendida, turno_preferencia, desconto_percentual, token")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const { data: docs } = await admin
        .from("matricula_documentos")
        .select("matricula_id, tipo, nome_arquivo, status, motivo");

      const lista = (mats ?? []).map((m) => ({
        ...m,
        prematricula: (pms ?? []).find((p) => p.id === m.prematricula_id) ?? null,
        documentos: DOCUMENTOS.map((d) => {
          const found = (docs ?? []).find((x) => x.matricula_id === m.id && x.tipo === d.tipo);
          return {
            tipo: d.tipo,
            label: d.label,
            status: found?.status ?? "pendente",
            nome_arquivo: found?.nome_arquivo ?? null,
            motivo: found?.motivo ?? null,
          };
        }),
      }));
      return json({ ok: true, lista });
    }

    const id = String(body?.id || "");
    if (!id) return json({ error: "id_invalido" }, 400);

    const { data: mat } = await admin.from("matriculas").select("*").eq("id", id).maybeSingle();
    if (!mat) return json({ error: "nao_encontrada" }, 404);

    const { data: pm } = await admin
      .from("prematriculas")
      .select("*")
      .eq("id", mat.prematricula_id)
      .maybeSingle();

    const base = {
      respNome: mat.resp_fin_nome || pm?.resp_nome || "",
      respEmail: mat.resp_fin_email || pm?.resp_email || "",
      respWhatsapp: mat.resp_fin_celular || pm?.resp_whatsapp || "",
      alunoNome: mat.nome_aluno || pm?.aluno_nome || "",
      protocolo: pm?.protocolo || "",
      linkMatricula: `${SITE_URL}/matricula?t=${pm?.token ?? ""}`,
    };

    if (acao === "doc_url") {
      const tipo = String(body?.tipo || "");
      if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "tipo_invalido" }, 400);
      const { data: doc } = await admin
        .from("matricula_documentos")
        .select("storage_path")
        .eq("matricula_id", id)
        .eq("tipo", tipo)
        .maybeSingle();
      if (!doc?.storage_path) return json({ error: "sem_arquivo" }, 404);
      const { data, error } = await admin.storage
        .from("matricula-docs")
        .createSignedUrl(doc.storage_path, 300);
      if (error) throw error;
      return json({ ok: true, url: data.signedUrl });
    }

    if (acao === "doc_status") {
      const tipo = String(body?.tipo || "");
      const novo = String(body?.status || "");
      if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "tipo_invalido" }, 400);
      if (!["aprovado", "rejeitado"].includes(novo)) return json({ error: "status_invalido" }, 400);
      const { error } = await admin
        .from("matricula_documentos")
        .update({
          status: novo,
          motivo: novo === "rejeitado" ? String(body?.motivo || "").slice(0, 300) || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("matricula_id", id)
        .eq("tipo", tipo);
      if (error) throw error;
      return json({ ok: true });
    }

    if (acao === "solicitar_reenvio") {
      const { data: docs } = await admin
        .from("matricula_documentos")
        .select("tipo, status")
        .eq("matricula_id", id);
      const rejeitados = (docs ?? []).filter((d) => d.status === "rejeitado").map((d) => labelDoc(d.tipo));
      const faltando = DOCUMENTOS.filter((d) => !(docs ?? []).some((x) => x.tipo === d.tipo)).map((d) => d.label);
      await admin
        .from("matriculas")
        .update({ status: "documentos_pendentes", updated_at: new Date().toISOString() })
        .eq("id", id);
      await notificar("documentos_reenvio", {
        ...base,
        documentosPendentes: [...rejeitados, ...faltando],
      });
      return json({ ok: true });
    }

    if (acao === "aprovar_documentos") {
      await admin
        .from("matricula_documentos")
        .update({ status: "aprovado", motivo: null, updated_at: new Date().toISOString() })
        .eq("matricula_id", id)
        .neq("status", "aprovado");
      await admin
        .from("matriculas")
        .update({
          status: "documentos_aprovados",
          documentos_aprovados_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      await notificar("documentos_aprovados", base);
      return json({ ok: true });
    }

    if (acao === "salvar") {
      const dados = (body?.dados ?? {}) as Record<string, unknown>;
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const campo of CAMPOS_EDITAVEIS) {
        if (!(campo in dados)) continue;
        const valor = dados[campo];
        if (BOOLEANOS.includes(campo)) update[campo] = !!valor;
        else if (NUMERICOS.includes(campo)) update[campo] = valor === "" || valor == null ? null : Number(valor);
        else if (INTEIROS.includes(campo)) update[campo] = valor === "" || valor == null ? null : parseInt(String(valor), 10);
        else if (DATAS.includes(campo)) update[campo] = valor ? String(valor).slice(0, 10) : null;
        else update[campo] = valor === "" ? null : String(valor);
      }
      const { error } = await admin.from("matriculas").update(update).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (acao === "gerar_contrato") {
      if (mat.contrato_gerado && mat.link_contrato) {
        return json({ ok: true, reutilizado: true, sign_url: mat.link_contrato });
      }
      const zapToken = Deno.env.get("ZAPSIGN_API_TOKEN");
      if (!zapToken) return json({ error: "zapsign_nao_configurado" }, 500);
      if (!mat.resp_fin_nome || digits(mat.resp_fin_cpf).length !== 11) {
        return json({ error: "responsavel_incompleto" }, 400);
      }

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
        return json({ error: "falha_contrato", detalhe: raw.slice(0, 300) }, 502);
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
      }).eq("id", id);

      await assinarEmLote(zapToken, signers).catch((e) => console.error("assinarEmLote", e));

      await notificar("contrato_pronto", base);
      return json({ ok: true, sign_url: signUrl });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("matricula-admin erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
