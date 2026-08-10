import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout } from "../_shared/asaas.ts";
import { DOCUMENTOS, TIPOS_VALIDOS, labelDoc } from "../_shared/matricula-docs.ts";
import { notificar } from "../_shared/prematricula-mensagens.ts";
import { gerarContrato, valoresProntos } from "../_shared/matricula-contrato.ts";

/** Campos que a família preenche no portal antes da geração do contrato. */
const CAMPOS_FAMILIA = [
  "resp_fin_quem", "resp_fin_nome", "resp_fin_cpf", "resp_fin_rg", "resp_fin_estado_civil",
  "resp_fin_naturalidade", "resp_fin_nacionalidade", "resp_fin_profissao",
  "resp_fin_data_nascimento", "resp_fin_celular", "resp_fin_email",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado",
  "nome_pai", "cpf_pai", "rg_pai", "estado_civil_pai", "naturalidade_pai", "nacionalidade_pai",
  "profissao_pai", "data_nascimento_pai", "celular_pai", "email_pai",
  "nome_mae", "cpf_mae", "rg_mae", "estado_civil_mae", "naturalidade_mae", "nacionalidade_mae",
  "profissao_mae", "data_nascimento_mae", "celular_mae", "email_mae",
];
const CAMPOS_DATA = ["resp_fin_data_nascimento", "data_nascimento_pai", "data_nascimento_mae"];
const OBRIGATORIOS_FAMILIA = [
  "resp_fin_quem", "resp_fin_nome", "resp_fin_cpf", "resp_fin_rg", "resp_fin_estado_civil",
  "resp_fin_naturalidade", "resp_fin_nacionalidade", "resp_fin_profissao",
  "resp_fin_data_nascimento", "resp_fin_celular", "resp_fin_email",
  "cep", "logradouro", "numero", "bairro", "cidade", "estado",
];

const FALLBACK_ORIGIN = "https://colegiozampieri.com.br";
const MAX_BYTES = 10 * 1024 * 1024;
const CHECKOUT_TTL_MS = 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const HOSTS_PERMITIDOS = ["colegiozampieri.com.br", "site-zampieri.lovable.app", "localhost"];
const safeOrigin = (req: Request, bodyOrigin?: unknown) => {
  const raw = String(bodyOrigin ?? "") || req.headers.get("origin") || "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return FALLBACK_ORIGIN;
    const ok = HOSTS_PERMITIDOS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)) ||
      u.hostname.endsWith(".lovable.app");
    return ok ? u.origin : FALLBACK_ORIGIN;
  } catch {
    return FALLBACK_ORIGIN;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "estado");
    const token = String(body?.token || "").trim();
    if (token.length < 20) return json({ error: "token_invalido" }, 401);

    const { data: pm } = await admin
      .from("prematriculas")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (!pm) return json({ error: "token_invalido" }, 401);
    if (pm.status !== "entrevista_concluida") return json({ error: "etapa_indisponivel" }, 403);

    // Garante o registro de matrícula
    let { data: mat } = await admin
      .from("matriculas")
      .select("*")
      .eq("prematricula_id", pm.id)
      .maybeSingle();
    if (!mat) {
      const ehPai = pm.resp_tipo === "pai";
      const ehMae = pm.resp_tipo === "mae";
      const { data: nova, error } = await admin
        .from("matriculas")
        .insert({
          prematricula_id: pm.id,
          nome_aluno: pm.aluno_nome,
          data_nascimento_aluno: pm.aluno_nascimento,
          curso: pm.serie_pretendida,
          turno: pm.turno_preferencia,
          percentual_desconto: pm.desconto_percentual,
          resp_fin_quem: pm.resp_tipo ?? null,
          resp_fin_nome: pm.resp_nome,
          resp_fin_cpf: pm.resp_cpf,
          resp_fin_celular: pm.resp_whatsapp,
          resp_fin_email: pm.resp_email,
          nome_pai: ehPai ? pm.resp_nome : null,
          cpf_pai: ehPai ? pm.resp_cpf : null,
          celular_pai: ehPai ? pm.resp_whatsapp : null,
          email_pai: ehPai ? pm.resp_email : null,
          nome_mae: ehMae ? pm.resp_nome : null,
          cpf_mae: ehMae ? pm.resp_cpf : null,
          celular_mae: ehMae ? pm.resp_whatsapp : null,
          email_mae: ehMae ? pm.resp_email : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      mat = nova;
    }

    const carregarDocs = async () => {
      const { data } = await admin
        .from("matricula_documentos")
        .select("tipo, nome_arquivo, status, motivo, created_at")
        .eq("matricula_id", mat!.id);
      return DOCUMENTOS.map((d) => {
        const enviado = (data ?? []).find((x) => x.tipo === d.tipo);
        return {
          tipo: d.tipo,
          label: d.label,
          obrigatorio: d.obrigatorio,
          status: enviado?.status ?? "pendente",
          nome_arquivo: enviado?.nome_arquivo ?? null,
          motivo: enviado?.motivo ?? null,
        };
      });
    };

    const estado = async () => ({
      ok: true,
      aluno: pm.aluno_nome,
      responsavel: pm.resp_nome,
      protocolo: pm.protocolo,
      serie: pm.serie_pretendida,
      turno: pm.turno_preferencia,
      desconto: pm.desconto_percentual,
      resp_tipo: pm.resp_tipo ?? null,
      dados: Object.fromEntries(CAMPOS_FAMILIA.map((c) => [c, mat![c] ?? ""])),
      valores: {
        anuidade_total: mat!.anuidade_total,
        anuidade_total_ext: mat!.anuidade_total_ext,
        percentual_desconto: mat!.percentual_desconto,
        valor_com_desconto: mat!.valor_com_desconto,
        valor_com_desconto_ext: mat!.valor_com_desconto_ext,
        valor_pri_parcela: mat!.valor_pri_parcela,
        dia_vencimento: mat!.dia_vencimento,
        prontos: valoresProntos(mat!),
      },
      matricula: {
        id: mat!.id,
        status: mat!.status,
        contrato_gerado: mat!.contrato_gerado,
        contrato_assinado: mat!.contrato_assinado,
        link_contrato: mat!.link_contrato,
        valor_matricula: mat!.valor_matricula,
        permite_avista: mat!.permite_avista,
        permite_parcelado: mat!.permite_parcelado,
        max_parcelas: mat!.max_parcelas,
        checkout_url: mat!.checkout_url,
        forma_pagamento: mat!.forma_pagamento,
        parcelas: mat!.parcelas,
        data_pagamento: mat!.data_pagamento,
        dados_preenchidos_em: mat!.dados_preenchidos_em,
      },
      documentos: await carregarDocs(),
    });

    if (acao === "estado") return json(await estado());

    if (acao === "upload") {
      const tipo = String(body?.tipo || "");
      if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "tipo_invalido" }, 400);
      if (["contrato_assinado", "concluida"].includes(String(mat.status))) {
        return json({ error: "etapa_encerrada" }, 400);
      }
      const nomeArquivo = String(body?.nome_arquivo || "documento").slice(0, 120);
      const base64 = String(body?.arquivo_base64 || "").split(",").pop() || "";
      if (!base64) return json({ error: "arquivo_ausente" }, 400);

      let bytes: Uint8Array;
      try {
        const bin = atob(base64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } catch {
        return json({ error: "arquivo_invalido" }, 400);
      }
      if (bytes.length > MAX_BYTES) return json({ error: "arquivo_grande" }, 400);

      const ext = (nomeArquivo.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1] || "bin").toLowerCase();
      if (!["pdf", "jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
        return json({ error: "formato_invalido" }, 400);
      }
      const path = `${mat.id}/${tipo}-${Date.now()}.${ext}`;
      const contentType = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;

      const { error: erroUp } = await admin.storage
        .from("matricula-docs")
        .upload(path, bytes, { contentType, upsert: true });
      if (erroUp) throw erroUp;

      const { error: erroDoc } = await admin
        .from("matricula_documentos")
        .upsert(
          {
            matricula_id: mat.id,
            tipo,
            storage_path: path,
            nome_arquivo: nomeArquivo,
            status: "enviado",
            motivo: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "matricula_id,tipo" },
        );
      if (erroDoc) throw erroDoc;

      return json(await estado());
    }

    if (acao === "enviar_analise") {
      const docs = await carregarDocs();
      const faltando = docs.filter((d) => d.obrigatorio && d.status !== "enviado" && d.status !== "aprovado");
      if (faltando.length) {
        return json({ error: "documentos_faltando", faltando: faltando.map((d) => d.label) }, 400);
      }
      await admin
        .from("matriculas")
        .update({ status: "documentos_em_analise", updated_at: new Date().toISOString() })
        .eq("id", mat.id);
      const jaEstava = mat.status === "documentos_em_analise";
      mat.status = "documentos_em_analise";
      if (!jaEstava) {
        // Apenas e-mail (não há template de WhatsApp para esta etapa).
        await notificar("documentos_recebidos", {
          respNome: pm.resp_nome,
          respEmail: pm.resp_email,
          respWhatsapp: pm.resp_whatsapp,
          alunoNome: pm.aluno_nome,
          protocolo: pm.protocolo,
        }).catch((e) => console.error("email documentos_recebidos:", e));
      }
      return json(await estado());
    }

    if (acao === "checkout") {
      if (!mat.contrato_assinado) return json({ error: "contrato_nao_assinado" }, 403);
      if (mat.status === "concluida") return json({ error: "ja_pago" }, 409);

      const forma = String(body?.forma_pagamento || "");
      if (forma !== "pix" && forma !== "credit_card") return json({ error: "forma_invalida" }, 400);
      const parcelas = Math.max(1, Math.min(Number(body?.parcelas) || 1, Number(mat.max_parcelas) || 1));
      const isParcelado = forma === "credit_card" && parcelas > 1;
      if (isParcelado && !mat.permite_parcelado) return json({ error: "parcelado_indisponivel" }, 400);
      if (!isParcelado && !mat.permite_avista) return json({ error: "avista_indisponivel" }, 400);

      const valorTotal = Number(mat.valor_matricula);
      if (!isFinite(valorTotal) || valorTotal <= 0) return json({ error: "valor_nao_configurado" }, 400);

      const criado = mat.checkout_criado_em ? new Date(mat.checkout_criado_em).getTime() : 0;
      if (
        mat.checkout_url && criado && Date.now() - criado < CHECKOUT_TTL_MS &&
        mat.forma_pagamento === forma && Number(mat.parcelas || 1) === parcelas
      ) {
        return json({ ok: true, checkout_url: mat.checkout_url, reused: true });
      }

      const nome = mat.resp_fin_nome || pm.resp_nome;
      const cpf = digits(mat.resp_fin_cpf || pm.resp_cpf);
      if (!nome || cpf.length !== 11) return json({ error: "responsavel_incompleto" }, 400);

      let customerId = mat.asaas_customer_id as string | null;
      if (!customerId) {
        const customer = await getOrCreateCustomer({
          name: nome,
          cpfCnpj: cpf,
          email: mat.resp_fin_email || pm.resp_email || undefined,
          mobilePhone: digits(mat.resp_fin_celular || pm.resp_whatsapp) || undefined,
        });
        customerId = customer?.id ?? null;
      }
      if (!customerId) return json({ error: "falha_cliente_asaas" }, 502);

      const origin = safeOrigin(req, body?.origin);
      const checkout = await createCheckout({
        customer: customerId,
        billingTypes: forma === "pix" ? ["PIX"] : ["CREDIT_CARD"],
        chargeTypes: isParcelado ? ["DETACHED", "INSTALLMENT"] : ["DETACHED"],
        items: [{
          name: "Matrícula",
          description: `Matrícula - ${mat.nome_aluno} (${mat.curso ?? ""})`,
          quantity: 1,
          value: valorTotal,
        }],
        successUrl: `${origin}/matricula?t=${token}&pagamento=sucesso`,
        cancelUrl: `${origin}/matricula?t=${token}&pagamento=cancelado`,
        expiredUrl: `${origin}/matricula?t=${token}&pagamento=expirado`,
        externalReference: `mat:${mat.id}`,
        minutesToExpire: 60,
        maxInstallmentCount: isParcelado ? parcelas : undefined,
      });

      const checkoutUrl = checkout?.link || checkout?.url || checkout?.checkoutUrl || null;
      await admin.from("matriculas").update({
        asaas_customer_id: customerId,
        asaas_checkout_id: checkout?.id ?? null,
        checkout_url: checkoutUrl,
        checkout_criado_em: new Date().toISOString(),
        forma_pagamento: forma,
        parcelas,
        updated_at: new Date().toISOString(),
      }).eq("id", mat.id);

      if (!checkoutUrl) return json({ error: "checkout_sem_link" }, 502);
      return json({ ok: true, checkout_url: checkoutUrl });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("matricula-portal erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
