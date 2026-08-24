import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { recomputeIngressosFinancials } from "../_shared/financeiro.ts";
import { getCheckout } from "../_shared/asaas.ts";
import { notificar } from "../_shared/prematricula-mensagens.ts";
import { enviarTemplateWebhook } from "../_shared/whatsapp-webhook.ts";

const STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "pago",
  PAYMENT_RECEIVED: "pago",
  PAYMENT_RECEIVED_IN_CASH: "pago",
  PAYMENT_OVERDUE: "pendente",
  PAYMENT_REFUNDED: "estornado",
  PAYMENT_REFUND_IN_PROGRESS: "estornado",
  PAYMENT_DELETED: "estornado",
  PAYMENT_CHARGEBACK_REQUESTED: "cancelado",
  PAYMENT_CHARGEBACK_DISPUTE: "cancelado",
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: "cancelado",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Validar token Asaas
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";
  const got = req.headers.get("asaas-access-token") || "";
  if (!expected || got !== expected) {
    console.warn("[asaas-webhook] token inválido");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId: string = payload?.id || `${payload?.event}-${payload?.payment?.id || payload?.checkout?.id}-${Date.now()}`;
  const eventType: string = payload?.event || "UNKNOWN";
  const paymentId: string | null = payload?.payment?.id || null;
  const installmentId: string | null = payload?.payment?.installment || null;
  const checkoutObj: any = payload?.checkout || null;
  // checkoutSession vem nos eventos PAYMENT_*; checkout.id vem nos eventos CHECKOUT_*
  const checkoutId: string | null = checkoutObj?.id || payload?.payment?.checkoutSession || null;

  // Idempotência
  const { error: insErr } = await admin.from("asaas_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    payment_id: paymentId,
    payload,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[asaas-webhook] insert event failed", insErr);
  }

  try {
    // Mapeamento de eventos de checkout
    const CHECKOUT_STATUS_MAP: Record<string, string> = {
      CHECKOUT_PAID: "pago",
      CHECKOUT_CANCELED: "pendente",
      CHECKOUT_EXPIRED: "pendente",
    };

    const newStatus = STATUS_MAP[eventType] || CHECKOUT_STATUS_MAP[eventType];
    // "Downgrade" events: expiração/cancelamento de checkout ou cobrança vencida.
    // Nesses casos NUNCA podemos rebaixar ingressos/pedidos já `pago` ou `estornado` para `pendente`.
    const isDowngrade = newStatus === "pendente";
    let externalRef: string | null =
      payload?.payment?.externalReference ||
      checkoutObj?.externalReference ||
      null;

    // Asaas omite externalReference no payload do PAYMENT_* (PIX especialmente).
    // Quando temos checkoutId mas não externalRef, consultamos /checkouts/{id}
    // para resgatar a referência original e cobrir TODOS os ingressos/pedidos do checkout
    // — corrige caso onde ingressos ficaram com checkout_id órfão (regerados em outro fluxo).
    if (!externalRef && checkoutId) {
      try {
        const co = await getCheckout(checkoutId);
        externalRef = co?.externalReference || null;
        if (externalRef) console.log("[asaas-webhook] externalRef recuperado via API", { checkoutId, externalRef });
      } catch (e) {
        console.warn("[asaas-webhook] falha ao consultar checkout no Asaas", (e as Error).message);
      }
    }


    // ============ ROTEAMENTO ============
    // - "reneg:<checkout_id>" → renegociação de débitos 2026/2027
    // - "remat:<id_aluno>" → rematrícula 2027
    // - "prod:..." → apenas pedidos_produtos
    // - "mix:ing=...;prod=..." → atualiza pedidos_produtos E continua para atualizar ingressos
    // - default → ingressos (fluxo abaixo)
    if (externalRef && externalRef.startsWith("reneg:")) {
      const regId = externalRef.slice(6);
      const { data: reg } = await admin
        .from("renegociacao_2027_checkouts")
        .select("*")
        .eq("id", regId)
        .maybeSingle();

      if (!reg) {
        console.warn("[asaas-webhook] renegociação não encontrada", { regId });
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rowIds: number[] = (reg.row_ids ?? []).map(Number);
      const pagoAgora = newStatus === "pago";
      const estornado = newStatus === "estornado" || newStatus === "cancelado";

      if (pagoAgora || estornado) {
        const valorTotal = Number(reg.valor_total ?? 0);
        const rateio = rowIds.length ? Number((valorTotal / rowIds.length).toFixed(2)) : 0;

        await admin.from("devedores_2027").update(
          pagoAgora
            ? {
              pago: true,
              pago_em: new Date().toISOString(),
              asaas_payment_id: installmentId || paymentId,
              asaas_checkout_id: reg.asaas_checkout_id,
              forma_pagamento: reg.forma_pagamento,
              valor_pago: rateio,
            }
            : {
              pago: false,
              pago_em: null,
              valor_pago: null,
              forma_pagamento: null,
            },
        ).in("row_id", rowIds).eq("id_aluno", reg.id_aluno);

        await admin.from("renegociacao_2027_checkouts").update({
          status: pagoAgora ? "pago" : "cancelado",
          asaas_payment_id: installmentId || paymentId,
        }).eq("id", reg.id);

        await admin.rpc("renegociacao_2027_recalcular_liberacao", { p_id_aluno: reg.id_aluno });
      }

      return new Response(JSON.stringify({ ok: true, renegociacao: reg.id, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (externalRef && externalRef.startsWith("remat:")) {
      const idAluno = Number(externalRef.slice(6));
      if (Number.isFinite(idAluno)) {
        if (newStatus === "pago") {
          const itensCheckout: any[] = Array.isArray(payload?.checkout?.items)
            ? payload.checkout.items
            : [];
          const somaItens = itensCheckout.reduce(
            (acc, it) => acc + Number(it?.value ?? 0) * Number(it?.quantity ?? 1),
            0,
          );
          const valor = Number(payload?.payment?.value ?? 0) ||
            Number(payload?.checkout?.value ?? 0) ||
            somaItens ||
            null;
          const { data: alunoRemat } = await admin.from("alunos_rematricula_2027").update({
            rematricula_concluida: true,
            asaas_payment_id: installmentId || paymentId,
            data_pagamento: new Date().toISOString(),
            valor_pago: valor,
            updated_at: new Date().toISOString(),
          }).eq("id_aluno", idAluno).select("*").maybeSingle();

          try {
            await admin.functions.invoke("rematricula-2027-email-conclusao", {
              body: { id_aluno: idAluno },
            });
          } catch (e) {
            console.error("[asaas-webhook] falha ao enviar e-mail de conclusão", e);
          }

          try {
            const a: any = alunoRemat || {};
            const { data: sorteRows } = await admin
              .from("rematricula_2027_numeros_sorte")
              .select("numero")
              .eq("id_aluno", idAluno)
              .order("numero");
            const numerosSorte = (sorteRows ?? []).map((r: { numero: string }) => r.numero);
            const usaPai = String(a.responsavel_financeiro || "").toLowerCase().includes("pai");
            const respNome = (usaPai ? a.nome_pai : a.nome_mae) || a.nome_mae || a.nome_pai || "";
            const respWhats = String(
              (usaPai ? a.celular_pai : a.celular_mae) || a.celular_mae || a.celular_pai || "",
            ).replace(/\D/g, "");
            const to = respWhats
              ? (respWhats.startsWith("55") ? respWhats : `55${respWhats}`)
              : "";
            const params = [
              respNome,
              a.nome_aluno || "",
              a.curso_2027 || "",
              a.turno || "",
            ];
            await enviarTemplateWebhook({
              evento: "rematricula_concluida",
              origem: "rematricula2027",
              template: "rematricula_concluida_u",
              template_utility: "rematricula_concluida_u",
              template_fallback: "rematricula_concluida",
              language: "pt_BR",
              to,
              telefone_original: (usaPai ? a.celular_pai : a.celular_mae) || "",
              params,
              body_params: Object.fromEntries(params.map((v, i) => [String(i + 1), v])),
              link: a.link_contrato || null,
              dados: {
                id_aluno: idAluno,
                aluno: a.nome_aluno || "",
                curso: a.curso_2027 || "",
                turno: a.turno || "",
                responsavel_financeiro: a.responsavel_financeiro || "",
                responsavel_nome: respNome,
                responsavel_email: (usaPai ? a.email_pai : a.email_mae) || a.email_mae || a.email_pai || "",
                responsavel_whatsapp: to,
                forma_pagamento: a.forma_pagamento || null,
                parcelas: a.parcelas ?? null,
                valor_pago: valor,
                link_contrato: a.link_contrato || null,
                contrato_assinado: !!a.contrato_assinado,
                data_pagamento: new Date().toISOString(),
                numeros_sorte: numerosSorte,
                numeros_sorte_texto: numerosSorte.join(", "),
                total_numeros_sorte: numerosSorte.length,
              },
              enviado_em: new Date().toISOString(),
            });
          } catch (e) {
            console.error("[asaas-webhook] falha ao enviar webhook de rematrícula concluída", e);
          }



        } else if (newStatus === "estornado" || newStatus === "cancelado") {
          await admin.from("alunos_rematricula_2027").update({
            rematricula_concluida: false,
            updated_at: new Date().toISOString(),
          }).eq("id_aluno", idAluno);
        }
      }
      await admin.from("asaas_webhook_events").update({ processed: true }).eq("event_id", eventId);
      return new Response(JSON.stringify({ ok: true, kind: "rematricula" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "mat:<uuid>" → matrícula (pós pré-matrícula)
    if (externalRef && externalRef.startsWith("mat:")) {
      const matId = externalRef.slice(4);
      if (newStatus === "pago") {
        const valor = Number(payload?.payment?.value ?? payload?.checkout?.value ?? 0) || null;
        const { data: mat } = await admin
          .from("matriculas")
          .update({
            status: "concluida",
            concluida_em: new Date().toISOString(),
            asaas_payment_id: installmentId || paymentId,
            data_pagamento: new Date().toISOString(),
            valor_pago: valor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matId)
          .select("prematricula_id, nome_aluno, curso, turno, link_contrato, contrato_assinado, resp_fin_nome, resp_fin_email, resp_fin_celular")
          .maybeSingle();

        try {
          const { data: pm } = await admin
            .from("prematriculas")
            .select("protocolo, resp_nome, resp_email, resp_whatsapp, aluno_nome, serie_pretendida, turno_preferencia")
            .eq("id", mat?.prematricula_id)
            .maybeSingle();
          await notificar("matricula_concluida", {
            respNome: mat?.resp_fin_nome || pm?.resp_nome || "",
            respEmail: mat?.resp_fin_email || pm?.resp_email || "",
            respWhatsapp: mat?.resp_fin_celular || pm?.resp_whatsapp || "",
            alunoNome: mat?.nome_aluno || pm?.aluno_nome || "",
            protocolo: pm?.protocolo || "",
            curso: mat?.curso || pm?.serie_pretendida || null,
            turno: mat?.turno || pm?.turno_preferencia || null,
            linkContrato: mat?.link_contrato || null,
            contratoAssinado: !!mat?.contrato_assinado,
          });
        } catch (e) {
          console.error("[asaas-webhook] falha ao notificar matrícula concluída", e);
        }
      } else if (newStatus === "estornado" || newStatus === "cancelado") {
        await admin.from("matriculas").update({
          status: "contrato_assinado",
          updated_at: new Date().toISOString(),
        }).eq("id", matId);
      }
      await admin.from("asaas_webhook_events").update({ processed: true }).eq("event_id", eventId);
      return new Response(JSON.stringify({ ok: true, kind: "matricula" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const isProdRef = !!(externalRef && externalRef.startsWith("prod:"));
    const isMixRef = !!(externalRef && externalRef.startsWith("mix:"));


    let mixProdIds: string[] = [];
    if (isMixRef) {
      const bodyRef = externalRef!.slice(4);
      for (const part of bodyRef.split(";")) {
        const [k, v] = part.split("=");
        if (!v) continue;
        const ids = v.split(",").map((s) => s.trim()).filter(Boolean);
        if (k === "prod") mixProdIds = ids;
      }
    }

    if (newStatus && (isProdRef || isMixRef || checkoutId)) {
      const prodIds = isProdRef
        ? externalRef!.slice(5).split(",").map((s) => s.trim()).filter(Boolean)
        : (isMixRef ? mixProdIds : []);
      const stableId = installmentId || paymentId;
      const updateP: any = { status: newStatus };
      if (stableId) updateP.asaas_payment_id = stableId;
      let matchedP: any[] | null = null;
      if (checkoutId) {
        let q = admin.from("pedidos_produtos").update(updateP).eq("checkout_id", checkoutId);
        if (isDowngrade) q = q.not("status", "in", "(pago,estornado)");
        const r = await q.select("id");
        if (!r.error) matchedP = r.data;
      }
      if ((!matchedP || matchedP.length === 0) && !checkoutId && prodIds.length > 0) {
        let q = admin.from("pedidos_produtos").update(updateP).in("id", prodIds);
        if (isDowngrade) q = q.not("status", "in", "(pago,estornado)");
        const r = await q.select("id");
        if (!r.error) matchedP = r.data;
      }
      if (matchedP && matchedP.length > 0) {
        if (newStatus === "pago") {
          try {
            const { recomputePedidosProdutos } = await import("../_shared/produtos-financeiro.ts");
            await recomputePedidosProdutos(admin, { checkoutId, paymentId, installmentId, pedidoIds: prodIds.length > 0 ? prodIds : matchedP.map((m) => m.id) });
          } catch (e) {
            console.error("[asaas-webhook] recompute produtos falhou", e);
          }
        } else if (newStatus === "estornado") {
          await admin.from("pedidos_produtos").update({
            valor_bruto: 0, valor_liquido: 0, taxa_total: 0, data_credito: null,
          }).in("id", matchedP.map((m) => m.id));
        }
      }
      // Em "prod:" puro, retorna aqui; em "mix:" segue para também atualizar ingressos.
      if (isProdRef && matchedP && matchedP.length > 0) {
        await admin.from("asaas_webhook_events").update({ processed: true }).eq("event_id", eventId);
        return new Response(JSON.stringify({ ok: true, kind: "produto" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (newStatus) {
      const update: any = { status: newStatus };
      // Para parcelado guardamos o id do PARCELAMENTO (estável entre as N parcelas).
      // Para pagamento simples guardamos o paymentId.
      const stableId = installmentId || paymentId;
      if (stableId) update.asaas_payment_id = stableId;
      if (newStatus === "pago") update.utilizado = false;

      let matched: any[] | null = null;

      // 1) Casa pelo checkout_id (mais confiável: vem do checkoutSession ou checkout.id)
      if (checkoutId) {
        let q = admin.from("ingressos").update(update).eq("checkout_id", checkoutId);
        if (isDowngrade) q = q.not("status", "in", "(pago,estornado)");
        const r = await q.select("id");
        if (r.error) throw r.error;
        matched = r.data;
      }

      // 2) Casa pelo asaas_payment_id já gravado (installmentId ou paymentId).
      //    Restringe sempre por checkout_id quando disponível para evitar contaminar
      //    ingressos de outros compradores que possam compartilhar o mesmo id por bug histórico.
      if ((!matched || matched.length === 0) && stableId && checkoutId) {
        let q = admin
          .from("ingressos")
          .update(update)
          .eq("asaas_payment_id", stableId)
          .eq("checkout_id", checkoutId);
        if (isDowngrade) q = q.not("status", "in", "(pago,estornado)");
        const r = await q.select("id");
        if (r.error) throw r.error;
        matched = r.data;
      }

      // 3) Fallback / reforço: ids vindos no externalReference (suporta também "mix:ing=...;prod=...").
      //    Roda SEMPRE que houver externalRef — assim cobrimos ingressos cujo checkout_id
      //    ficou órfão (não bateu no passo 1) mas que pertencem ao mesmo pagamento.
      //    Em eventos de "downgrade" (CHECKOUT_EXPIRED/CANCELED, PAYMENT_OVERDUE) NÃO regravamos
      //    checkout_id e protegemos ingressos já pago/estornado — evita rebaixar tickets pagos
      //    quando um checkout antigo (órfão) expira mais tarde.
      if (externalRef) {
        let ids: string[] = [];
        if (isMixRef) {
          const bodyRef = externalRef.slice(4);
          for (const part of bodyRef.split(";")) {
            const [k, v] = part.split("=");
            if (k === "ing" && v) ids = v.split(",").map((s) => s.trim()).filter(Boolean);
          }
        } else if (!isProdRef) {
          ids = externalRef.split(",").map((s) => s.trim()).filter(Boolean);
        }
        const alreadyMatchedIds = new Set((matched || []).map((m: any) => m.id));
        const idsToFix = ids.filter((id) => !alreadyMatchedIds.has(id));
        if (idsToFix.length > 0) {
          const updateFix: any = { ...update };
          // Só regrava checkout_id em eventos "positivos" (pagamento/checkout pago).
          if (!isDowngrade && checkoutId) updateFix.checkout_id = checkoutId;
          let q = admin.from("ingressos").update(updateFix).in("id", idsToFix);
          if (isDowngrade) q = q.not("status", "in", "(pago,estornado)");
          const r = await q.select("id");
          if (r.error) throw r.error;
          matched = [...(matched || []), ...(r.data || [])];
        }
      }

      // Dispara e-mail de confirmação (best-effort)
      if (newStatus === "pago" && matched && matched.length > 0) {
        // Recalcula valor líquido / taxas via API Asaas (best-effort).
        // Em parcelado, soma TODAS as parcelas via installmentId.
        try {
          await recomputeIngressosFinancials(admin, {
            checkoutId,
            paymentId,
            installmentId,
            externalRef,
          });
        } catch (e) {
          console.error("[asaas-webhook] recomputeFinancials falhou", e);
        }

        if (paymentId) {
          admin.functions.invoke("enviar-confirmacao-ingresso", {
            body: { payment_id: paymentId },
          }).catch((e) => console.error("[asaas-webhook] envio email falhou", e));
        } else {
          // Fluxo Checkout: dispara um envio por ingresso pago
          for (const row of matched) {
            admin.functions.invoke("enviar-confirmacao-ingresso", {
              body: { ingresso_id: row.id },
            }).catch((e) => console.error("[asaas-webhook] envio email (checkout) falhou", e));
          }
        }
      } else if (newStatus === "estornado" && matched && matched.length > 0) {
        // Zera valores financeiros em estorno
        await admin.from("ingressos").update({
          valor_bruto: 0, valor_liquido: 0, taxa_total: 0, data_credito: null,
        }).in("id", matched.map((m) => m.id));
      }
    }

    await admin
      .from("asaas_webhook_events")
      .update({ processed: true })
      .eq("event_id", eventId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[asaas-webhook] processing error", e);
    await admin
      .from("asaas_webhook_events")
      .update({ error: e.message || String(e) })
      .eq("event_id", eventId);
    // Sempre 200 para não disparar retries infinitos
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
