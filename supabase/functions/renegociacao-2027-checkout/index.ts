import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getOrCreateCustomer, updateCustomer, createCheckout } from "../_shared/asaas.ts";
import { valoresRenegociacao } from "../_shared/renegociacao-desconto.ts";

const CHECKOUT_TTL_MS = 60 * 60 * 1000; // 60 min
const FALLBACK_ORIGIN = "https://colegiozampieri.com.br";

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const HOSTS_PERMITIDOS = ["colegiozampieri.com.br", "site-zampieri.lovable.app", "localhost"];

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
    const rowIds = Array.isArray(body?.row_ids)
      ? [...new Set(body.row_ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n)))]
      : [];

    if (!Number.isFinite(idAluno) || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }
    if (forma !== "pix" && forma !== "credit_card") {
      return json({ error: "Forma de pagamento inválida" }, 400);
    }
    if (rowIds.length === 0) return json({ error: "nenhum_debito_selecionado" }, 400);

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

    // Todos os débitos do aluno: o desconto depende de pagar todos os abertos juntos
    const { data: debitos, error: debErr } = await admin
      .from("devedores_2027")
      .select("row_id, evento, vencimento, valor_principal, juros, multa, valor_atualizado, pago")
      .eq("id_aluno", idAluno);

    if (debErr) throw debErr;

    const todosAbertos = (debitos ?? []).filter((d) => !d.pago);
    const abertos = todosAbertos.filter((d) => rowIds.includes(Number(d.row_id)));
    if (abertos.length === 0) return json({ error: "debitos_ja_pagos" }, 409);
    if (abertos.length !== rowIds.length) {
      return json({ error: "selecao_invalida" }, 409);
    }

    const totalAtualizado = abertos.reduce(
      (acc, d) =>
        acc + Number(d.valor_atualizado ?? Number(d.valor_principal || 0) + Number(d.juros || 0) + Number(d.multa || 0)),
      0,
    );
    const valores = valoresRenegociacao(totalAtualizado, todosAbertos.length, abertos.length);
    const valorTotal = isParcelado ? valores.parcelado : valores.avista;
    if (!isFinite(valorTotal) || valorTotal <= 0) {
      return json({ error: "valor_invalido" }, 400);
    }

    // Reaproveita checkout pendente recente com a mesma seleção
    const rowIdsOrdenados = [...abertos.map((d) => Number(d.row_id))].sort((a, b) => a - b);
    const desde = new Date(Date.now() - CHECKOUT_TTL_MS).toISOString();
    const { data: anterior } = await admin
      .from("renegociacao_2027_checkouts")
      .select("*")
      .eq("id_aluno", idAluno)
      .eq("status", "pendente")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      anterior?.checkout_url && !body?.force_regenerate &&
      anterior.forma_pagamento === forma && Number(anterior.parcelas || 1) === parcelas &&
      JSON.stringify([...(anterior.row_ids ?? [])].map(Number).sort((a, b) => a - b)) ===
        JSON.stringify(rowIdsOrdenados) &&
      // Só reaproveita se o valor ainda for o mesmo (regra de desconto ou débitos podem ter mudado)
      Math.abs(Number(anterior.valor_total) - valorTotal) < 0.01
    ) {
      return json({ checkout_url: anterior.checkout_url, reused: true, valor: Number(anterior.valor_total) });
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

    let customerId = (aluno.asaas_customer_id as string | null) ?? null;
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
    // Checkout do Asaas exige e-mail no cliente: garante antes de cobrar
    if (email) {
      try { await updateCustomer(customerId, { email, ...(celular ? { mobilePhone: celular } : {}) }); }
      catch (e) { console.warn("[asaas] updateCustomer email:", (e as Error).message); }
    }

    const { data: registro, error: regErr } = await admin
      .from("renegociacao_2027_checkouts")
      .insert({
        id_aluno: idAluno,
        row_ids: rowIdsOrdenados,
        valor_total: Number(valorTotal.toFixed(2)),
        forma_pagamento: forma,
        parcelas,
        asaas_customer_id: customerId,
        status: "pendente",
      })
      .select("id")
      .single();

    if (regErr) throw regErr;

    const origin = safeOrigin(req, body?.origin);
    // Obrigado na rematrícula: quem quitou tudo já segue dali para a rematrícula 2027
    const successUrl = `${origin}/rematricula2027?renegociacao=paga`;

    const checkout = await createCheckout({
      customer: customerId,
      billingTypes: forma === "pix" ? ["PIX"] : ["CREDIT_CARD"],
      chargeTypes: isParcelado ? ["DETACHED", "INSTALLMENT"] : ["DETACHED"],
      items: [{
        name: "Regularizacao 2026",
        description: `Regularização de ${abertos.length} mensalidade(s) - ${aluno.nome_aluno}`,
        quantity: 1,
        value: Number(valorTotal.toFixed(2)),
      }],
      successUrl,
      cancelUrl: `${origin}/renegociacao?pagamento=cancelado&aluno=${idAluno}`,
      expiredUrl: `${origin}/renegociacao?pagamento=expirado&aluno=${idAluno}`,
      externalReference: `reneg:${registro.id}`,
      minutesToExpire: 60,
      maxInstallmentCount: isParcelado ? parcelas : undefined,
    });

    const checkoutUrl = checkout?.link || checkout?.url || checkout?.checkoutUrl || null;

    await admin.from("renegociacao_2027_checkouts").update({
      asaas_checkout_id: checkout?.id ?? null,
      checkout_url: checkoutUrl,
    }).eq("id", registro.id);

    if (!checkoutUrl) return json({ error: "Checkout criado sem link" }, 502);

    return json({ checkout_url: checkoutUrl, valor: Number(valorTotal.toFixed(2)), parcelas });
  } catch (e) {
    console.error("[renegociacao-2027-checkout]", e);
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});
