// Admin: cancela uma rematrícula 2027.
// - Estorna/cancela pagamentos no Asaas (quando houver)
// - Cancela o contrato na ZapSign (quando houver)
// - Reseta o aluno para que a família possa refazer o processo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayment, listInstallmentPayments, refundPayment, deletePayment } from "../_shared/asaas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const PENDING = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");

    const userClient = createClient(supaUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supaUrl, service);
    const { data: permitido } = await admin.rpc("has_setor", {
      _user_id: userData.user.id,
      _setor: "rematricula",
    });
    if (!permitido) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body.id_aluno);
    const motivo = String(body.motivo || "").trim();
    if (!Number.isFinite(idAluno) || idAluno <= 0) return json({ error: "invalid_input" }, 400);
    if (motivo.length < 3) return json({ error: "motivo_obrigatorio" }, 400);

    const { data: aluno, error: getErr } = await admin
      .from("alunos_rematricula_2027")
      .select(
        "id_aluno, nome_aluno, asaas_payment_id, valor_pago, zapsign_token, rematricula_concluida, contrato_gerado, contrato_assinado",
      )
      .eq("id_aluno", idAluno)
      .maybeSingle();
    if (getErr || !aluno) return json({ error: "not_found" }, 404);

    const avisos: string[] = [];
    const refunds: unknown[] = [];
    let estornado = 0;

    // 1) Asaas
    if (aluno.asaas_payment_id) {
      let payments: any[] = [];
      try {
        const inst = await listInstallmentPayments(aluno.asaas_payment_id).catch(() => null);
        if (inst?.data && Array.isArray(inst.data) && inst.data.length > 0) {
          payments = inst.data;
        } else {
          const p = await getPayment(aluno.asaas_payment_id);
          if (p?.installment) {
            const d = await listInstallmentPayments(p.installment);
            payments = d?.data || [p];
          } else if (p) {
            payments = [p];
          }
        }
      } catch (e) {
        avisos.push(`Não foi possível consultar o pagamento no Asaas: ${(e as Error).message}`);
      }

      for (const p of payments) {
        try {
          if (PAID.has(p.status)) {
            const r = await refundPayment(p.id, { description: motivo.slice(0, 250) });
            estornado += Number(p.value || 0);
            refunds.push({ id: p.id, action: "refund", status: r?.status });
          } else if (PENDING.has(p.status)) {
            await deletePayment(p.id);
            refunds.push({ id: p.id, action: "delete" });
          } else {
            refunds.push({ id: p.id, action: "skip", status: p.status });
          }
        } catch (e) {
          avisos.push(`Falha ao estornar o pagamento ${p.id}: ${(e as Error).message}`);
        }
      }
    }

    // 2) ZapSign
    let contratoCancelado = false;
    if (aluno.zapsign_token) {
      const zToken = Deno.env.get("ZAPSIGN_API_TOKEN");
      if (!zToken) {
        avisos.push("ZAPSIGN_API_TOKEN não configurado — contrato não foi cancelado.");
      } else {
        try {
          const resp = await fetch(`https://api.zapsign.com.br/api/v1/docs/${aluno.zapsign_token}/`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${zToken}` },
          });
          if (resp.ok) contratoCancelado = true;
          else {
            const raw = await resp.text().catch(() => "");
            avisos.push(`ZapSign respondeu ${resp.status} ao cancelar o contrato. ${raw.slice(0, 200)}`);
          }
        } catch (e) {
          avisos.push(`Falha ao cancelar o contrato na ZapSign: ${(e as Error).message}`);
        }
      }
    }

    // 3) Reset do aluno
    const agora = new Date().toISOString();
    const { error: upErr } = await admin
      .from("alunos_rematricula_2027")
      .update({
        contrato_gerado: false,
        contrato_assinado: false,
        link_contrato: null,
        zapsign_token: null,
        rematricula_concluida: false,
        conferida: false,
        conferida_em: null,
        conferida_por: null,
        asaas_checkout_id: null,
        asaas_payment_id: null,
        checkout_url: null,
        checkout_criado_em: null,
        forma_pagamento: null,
        parcelas: null,
        valor_pago: null,
        data_pagamento: null,
        email_conclusao_enviado_em: null,
        cancelada: true,
        cancelada_em: agora,
        cancelada_por: userData.user.id,
        motivo_cancelamento: motivo,
        estorno_valor: estornado > 0 ? estornado : null,
        estorno_em: estornado > 0 ? agora : null,
      })
      .eq("id_aluno", idAluno);
    if (upErr) throw upErr;

    await admin.from("rematricula_2027_alteracoes").insert({
      id_aluno: idAluno,
      campo: "cancelamento",
      valor_anterior: aluno.rematricula_concluida ? "concluida" : "em_andamento",
      valor_novo: `cancelada: ${motivo}`,
    }).then(() => null, () => null);

    await admin.rpc("notificar_admin", {
      _setor: "rematricula",
      _tipo: "rematricula_cancelada",
      _titulo: "Rematrícula cancelada",
      _descricao: `${aluno.nome_aluno} — ${motivo}`,
      _link: "/admin/rematriculas",
      _ref_id: String(idAluno),
    }).then(() => null, () => null);

    return json({
      ok: true,
      estornado,
      contrato_cancelado: contratoCancelado,
      refunds,
      avisos,
    });
  } catch (e) {
    console.error("[rematricula-2027-admin-cancelar]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
