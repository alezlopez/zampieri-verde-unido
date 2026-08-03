import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, createCheckout } from "../_shared/asaas.ts";

const CHECKOUT_TTL_MS = 60 * 60 * 1000; // 60 min
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
    if (forma !== "pix" && forma !== "credit_card") {
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

    if (!aluno.contrato_assinado) {
      return json({ error: "contrato_nao_assinado" }, 403);
    }
    if (aluno.rematricula_concluida) {
      return json({ error: "ja_pago" }, 409);
    }

    // Reaproveita checkout válido com a mesma configuração
    const criado = aluno.checkout_criado_em ? new Date(aluno.checkout_criado_em).getTime() : 0;
    const valido = criado && Date.now() - criado < CHECKOUT_TTL_MS;
    if (
      aluno.checkout_url && valido && !body?.force_regenerate &&
      aluno.forma_pagamento === forma && Number(aluno.parcelas || 1) === parcelas
    ) {
      return json({ checkout_url: aluno.checkout_url, checkout_id: aluno.asaas_checkout_id, reused: true });
    }

    // Valor pelo curso
    const { data: valores } = await admin
      .from("rematricula_valores_2027")
      .select("valor_rematricula, valor_promocional, valor_promocional_pacelado, promocao_ate")
      .eq("curso_2027", aluno.curso_2027)
      .eq("ativo", true)
      .maybeSingle();

    if (!valores) return json({ error: "Valor de rematrícula não configurado para o curso" }, 400);

    const hoje = new Date().toISOString().slice(0, 10);
    const promoVigente = !valores.promocao_ate || String(valores.promocao_ate).slice(0, 10) >= hoje;

    const valorAvista = Number(
      promoVigente && valores.valor_promocional != null
        ? valores.valor_promocional
        : valores.valor_rematricula,
    );
    const valorParcelado = Number(
      promoVigente && valores.valor_promocional_pacelado != null
        ? valores.valor_promocional_pacelado
        : valores.valor_rematricula,
    );

    const valorTotal = isParcelado ? valorParcelado : valorAvista;
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
      minutesToExpire: 60,
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
