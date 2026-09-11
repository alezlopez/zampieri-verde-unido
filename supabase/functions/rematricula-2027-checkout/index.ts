import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout, createPayment, getPayment, getPixQrCode, deletePayment } from "../_shared/asaas.ts";
import { rematriculaLiberada } from "../_shared/rematricula-abertura.ts";

const CHECKOUT_MINUTES = 1440; // 24h (máximo aceito pelo Asaas)
const CHECKOUT_TTL_MS = CHECKOUT_MINUTES * 60 * 1000;
const FALLBACK_ORIGIN = "https://colegiozampieri.com.br";

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

// Allowlist explícita de destinos de redirecionamento pós-pagamento
const HOSTS_PERMITIDOS = [
  "colegiozampieri.com.br",
  "site-zampieri.lovable.app",
  "localhost",
];

const hostPermitido = (hostname: string) =>
  HOSTS_PERMITIDOS.some((h) => hostname === h || hostname.endsWith(`.${h}`)) ||
  hostname.endsWith(".lovable.app");

const safeOrigin = (req: Request, bodyOrigin?: unknown) => {
  const raw = String(bodyOrigin ?? "") || req.headers.get("origin") || "";
  try {
    if (!rematriculaLiberada()) {
      return json({ error: "rematricula_nao_liberada" }, 403);
    }
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return FALLBACK_ORIGIN;
    if (!hostPermitido(u.hostname)) return FALLBACK_ORIGIN;
    return u.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body?.id_aluno);
    const dataNascimento = String(body?.data_nascimento ?? "").slice(0, 10);
    const forma = String(body?.forma_pagamento ?? "");
    const parcelas = Math.max(1, Math.min(Number(body?.parcelas) || 1, 12));

    if (!Number.isFinite(idAluno) || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }
    if (!body?.apenas_consultar && forma !== "pix" && forma !== "credit_card") {
      return json({ error: "Forma de pagamento inválida" }, 400);
    }
    const isParcelado = forma === "credit_card" && parcelas > 1;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: aluno, error: alunoErr } = await admin
      .from("alunos_rematricula_2027")
      .select("*")
      .eq("id_aluno", idAluno)
      .eq("data_nascimento_aluno", dataNascimento)
      .maybeSingle();

    if (alunoErr) throw alunoErr;
    if (!aluno) return json({ error: "Aluno não encontrado" }, 404);
    if (aluno.rematricula_liberada !== true) {
      return json({ error: "rematricula_nao_liberada" }, 403);
    }

    if (!aluno.contrato_assinado) {
      return json({ error: "contrato_nao_assinado" }, 403);
    }
    if (aluno.rematricula_concluida) {
      return json({ error: "ja_pago" }, 409);
    }
    if (aluno.isentar_valor_rematricula) {
      return json({ error: "rematricula_isenta" }, 409);
    }

    // Valor pela fase vigente do calendário — ou pela fase concedida como exceção ao aluno
    const faseExcecao = aluno.fase_excecao != null ? Number(aluno.fase_excecao) : null;
    const { data: vigente, error: vigenteErr } = await admin
      .rpc("rematricula_2027_valor_vigente", {
        p_curso: aluno.curso_2027,
        p_fase: faseExcecao,
      })
      .maybeSingle();

    if (vigenteErr) throw vigenteErr;
    if (!vigente) return json({ error: "Valor de rematrícula não configurado para o curso" }, 400);

    // Início da fase vigente (00:00 no horário de Brasília)
    const faseInicioMs = vigente.fase_inicio
      ? new Date(`${String(vigente.fase_inicio).slice(0, 10)}T00:00:00-03:00`).getTime()
      : 0;

    // ===== Pagamento já gerado: reaproveitado até expirar, desde que seja da fase atual =====
    const criado = aluno.checkout_criado_em ? new Date(aluno.checkout_criado_em).getTime() : 0;
    const dentroDaJanela = !!criado && Date.now() - criado < CHECKOUT_TTL_MS;
    const faseVirou = faseExcecao == null && !!criado && !!faseInicioMs && criado < faseInicioMs;
    const valido = dentroDaJanela && !faseVirou;

    // Cobrança gerada em fase anterior: cancela para ninguém pagar o valor vencido
    if (faseVirou && (aluno.asaas_payment_id || aluno.checkout_url)) {
      if (aluno.asaas_payment_id) {
        try {
          const pay = await getPayment(aluno.asaas_payment_id);
          if (pay?.status === "PENDING") await deletePayment(aluno.asaas_payment_id);
        } catch (e) {
          console.warn("[rematricula-2027-checkout] falha ao cancelar cobrança de fase anterior", (e as Error).message);
        }
      }
      await admin.from("alunos_rematricula_2027").update({
        asaas_payment_id: null,
        asaas_checkout_id: null,
        checkout_url: null,
        checkout_criado_em: null,
        updated_at: new Date().toISOString(),
      }).eq("id_aluno", idAluno);
      aluno.asaas_payment_id = null;
      aluno.asaas_checkout_id = null;
      aluno.checkout_url = null;
      aluno.checkout_criado_em = null;
    }

    // PIX: cobrança direta, QR exibido na nossa própria página
    if (aluno.asaas_payment_id && aluno.forma_pagamento === "pix" && valido) {
      try {
        const pay = await getPayment(aluno.asaas_payment_id);
        if (pay?.status === "PENDING") {
          const qr = await getPixQrCode(aluno.asaas_payment_id);
          const qrExpira = qr?.expirationDate
            ? new Date(String(qr.expirationDate).replace(" ", "T")).getTime()
            : 0;
          // Nossa janela real: 24h a partir da criação da cobrança
          const limite = criado + CHECKOUT_TTL_MS;
          const expiraMs = qrExpira ? Math.min(qrExpira, limite) : limite;
          if (qr?.payload && expiraMs > Date.now()) {
            return json({
              mode: "pix",
              reused: true,
              existente: true,
              payment_id: aluno.asaas_payment_id,
              valor: Number(pay?.value ?? 0),
              pix: {
                copia_cola: qr.payload,
                qr_image: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
                expira_em: new Date(expiraMs).toISOString(),
              },
            });
          }
        }
      } catch (e) {
        console.warn("[rematricula-2027-checkout] falha ao reaproveitar PIX", (e as Error).message);
      }
    }

    if (aluno.checkout_url && valido && aluno.forma_pagamento && aluno.forma_pagamento !== "pix") {
      return json({
        mode: "cartao",
        checkout_url: aluno.checkout_url,
        checkout_id: aluno.asaas_checkout_id,
        reused: true,
        existente: true,
        forma_pagamento: aluno.forma_pagamento,
        parcelas: Number(aluno.parcelas || 1),
        expira_em: new Date(criado + CHECKOUT_TTL_MS).toISOString(),
      });
    }

    // Consulta pura: não cria nada quando não há pagamento pendente
    if (body?.apenas_consultar) return json({ existente: false, fase_virou: faseVirou });




    const valorTotal = Number(isParcelado ? vigente.valor_parcelado : vigente.valor_avista);
    if (!isFinite(valorTotal) || valorTotal <= 0) {
      return json({ error: "Valor de rematrícula inválido" }, 400);
    }


    // Responsável financeiro (mãe por padrão)
    const respRaw = String(aluno.responsavel_financeiro || "").toLowerCase();
    const usaPai = respRaw.includes("pai");
    const nome = (usaPai ? aluno.nome_pai : aluno.nome_mae) || aluno.nome_mae || aluno.nome_pai;
    const cpf = digits(usaPai ? aluno.cpf_pai : aluno.cpf_mae) || digits(aluno.cpf_mae) || digits(aluno.cpf_pai);
    const email = (usaPai ? aluno.email_pai : aluno.email_mae) || aluno.email_mae || aluno.email_pai || undefined;
    const celular = digits(usaPai ? aluno.celular_pai : aluno.celular_mae) ||
      digits(aluno.celular_mae) || digits(aluno.celular_pai);

    if (!nome || cpf.length !== 11) {
      return json({ error: "Dados do responsável financeiro incompletos" }, 400);
    }

    let customerId = aluno.asaas_customer_id as string | null;
    if (!customerId) {
      const customer = await getOrCreateCustomer({
        name: nome,
        cpfCnpj: cpf,
        email,
        mobilePhone: celular || undefined,
      });
      customerId = customer?.id ?? null;
    }
    if (!customerId) return json({ error: "Falha ao criar cliente no Asaas" }, 502);

    const origin = safeOrigin(req, body?.origin);
    const successUrl = `${origin}/rematricula2027?pagamento=sucesso&aluno=${idAluno}`;

    // ===== PIX: cobrança direta, sem depender da tela de checkout do Asaas =====
    if (forma === "pix") {
      const venc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const pagamento = await createPayment({
        customer: customerId,
        billingType: "PIX",
        value: valorTotal,
        dueDate: venc,
        description: `Rematrícula 2027 - ${aluno.nome_aluno} (${aluno.curso_2027})`,
        externalReference: `remat:${idAluno}`,
      });
      if (!pagamento?.id) return json({ error: "Falha ao gerar cobrança PIX" }, 502);

      const qr = await getPixQrCode(pagamento.id);
      if (!qr?.payload) return json({ error: "Falha ao gerar código PIX" }, 502);
      const qrExpiraNovo = qr?.expirationDate
        ? new Date(String(qr.expirationDate).replace(" ", "T")).getTime()
        : 0;
      const limiteNovo = Date.now() + CHECKOUT_TTL_MS;
      const expira = new Date(qrExpiraNovo ? Math.min(qrExpiraNovo, limiteNovo) : limiteNovo);

      await admin.from("alunos_rematricula_2027").update({
        asaas_customer_id: customerId,
        asaas_payment_id: pagamento.id,
        asaas_checkout_id: null,
        checkout_url: pagamento.invoiceUrl ?? null,
        checkout_criado_em: new Date().toISOString(),
        forma_pagamento: "pix",
        parcelas: 1,
        updated_at: new Date().toISOString(),
      }).eq("id_aluno", idAluno);

      return json({
        mode: "pix",
        payment_id: pagamento.id,
        valor: valorTotal,
        invoice_url: pagamento.invoiceUrl ?? null,
        pix: {
          copia_cola: qr.payload,
          qr_image: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
          expira_em: expira.toISOString(),
        },
      });
    }


    const checkout = await createCheckout({
      customer: customerId,
      billingTypes: forma === "pix" ? ["PIX"] : ["CREDIT_CARD"],
      // Asaas exige DETACHED junto com INSTALLMENT
      chargeTypes: isParcelado ? ["DETACHED", "INSTALLMENT"] : ["DETACHED"],
      items: [{
        name: "Rematricula 2027",
        description: `Rematrícula 2027 - ${aluno.nome_aluno} (${aluno.curso_2027})`,
        quantity: 1,
        value: valorTotal,
      }],
      successUrl,
      cancelUrl: `${origin}/rematricula2027?pagamento=cancelado&aluno=${idAluno}`,
      expiredUrl: `${origin}/rematricula2027?pagamento=expirado&aluno=${idAluno}`,
      externalReference: `remat:${idAluno}`,
      minutesToExpire: CHECKOUT_MINUTES,
      maxInstallmentCount: isParcelado ? parcelas : undefined,
    });

    const checkoutUrl = checkout?.link || checkout?.url || checkout?.checkoutUrl || null;

    await admin.from("alunos_rematricula_2027").update({
      asaas_customer_id: customerId,
      asaas_checkout_id: checkout?.id ?? null,
      checkout_url: checkoutUrl,
      checkout_criado_em: new Date().toISOString(),
      forma_pagamento: forma,
      parcelas,
      updated_at: new Date().toISOString(),
    }).eq("id_aluno", idAluno);

    if (!checkoutUrl) return json({ error: "Checkout criado sem link" }, 502);

    return json({ checkout_url: checkoutUrl, checkout_id: checkout?.id ?? null, valor: valorTotal, parcelas });
  } catch (e) {
    console.error("[rematricula-2027-checkout]", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});
