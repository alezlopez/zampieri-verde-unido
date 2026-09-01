// Follow-up automático da Rematrícula 2027.
// - Modo cron (sem usuário): dispara até 3 mensagens por etapa e cancela
//   automaticamente quem assinou e não pagou depois do prazo.
// - Modo manual (JWT + setor rematricula): reenvia uma mensagem específica.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayment, listInstallmentPayments, deletePayment } from "../_shared/asaas.ts";
import {
  AlunoFollowup,
  brl,
  CADENCIA_DIAS,
  dataBR,
  destinatario,
  enviarCancelamento,
  enviarFollowup,
  EtapaFollowup,
  PRAZO_CANCELAMENTO_DIAS,
  templateDe,
} from "../_shared/rematricula-followup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PENDING = new Set(["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"]);
const DIA_MS = 86400000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Linha = AlunoFollowup & {
  contrato_gerado: boolean | null;
  contrato_assinado: boolean | null;
  rematricula_concluida: boolean | null;
  cancelada: boolean | null;
  rematricula_liberada: boolean | null;
  isentar_valor_rematricula: boolean | null;
  followup_pausado: boolean | null;
  prazo_cancelamento_em: string | null;
  turno_escolhido: string | null;
  updated_at: string | null;
  created_at: string | null;
  checkout_url: string | null;
  valor_com_desconto: number | null;
  zapsign_token: string | null;
  asaas_payment_id: string | null;
};

const CAMPOS =
  "id_aluno, nome_aluno, responsavel_financeiro, nome_pai, celular_pai, telefone_pai, nome_mae, celular_mae, telefone_mae, contrato_gerado, contrato_assinado, rematricula_concluida, cancelada, rematricula_liberada, isentar_valor_rematricula, followup_pausado, prazo_cancelamento_em, turno_escolhido, updated_at, created_at, checkout_url, valor_com_desconto, zapsign_token, asaas_payment_id";

const etapaDe = (l: Linha, qtdAlteracoes: number): EtapaFollowup | null => {
  if (l.rematricula_concluida) return null;
  if (l.contrato_assinado) return "pagar";
  if (l.contrato_gerado) return "assinar";
  if (qtdAlteracoes > 0 || l.turno_escolhido) return "parou";
  return null; // quem nunca iniciou não entra no follow-up automático
};

const diasDesde = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DIA_MS) : null;

async function valorRematricula(admin: any, l: Linha) {
  return brl(l.valor_com_desconto);
}

async function cancelarAluno(admin: any, l: Linha, motivo: string) {
  // Asaas: apaga cobranças pendentes (não há pagamento confirmado nesse fluxo)
  if (l.asaas_payment_id) {
    try {
      let payments: any[] = [];
      const inst = await listInstallmentPayments(l.asaas_payment_id).catch(() => null);
      if (inst?.data?.length) payments = inst.data;
      else {
        const p = await getPayment(l.asaas_payment_id).catch(() => null);
        if (p) payments = [p];
      }
      for (const p of payments) {
        if (PENDING.has(p.status)) await deletePayment(p.id).catch(() => null);
      }
    } catch (e) {
      console.error("[followup] asaas", l.id_aluno, (e as Error).message);
    }
  }

  // ZapSign
  if (l.zapsign_token) {
    const zToken = Deno.env.get("ZAPSIGN_API_TOKEN");
    if (zToken) {
      await fetch(`https://api.zapsign.com.br/api/v1/docs/${l.zapsign_token}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${zToken}` },
      }).catch(() => null);
    }
  }

  const agora = new Date().toISOString();
  await admin
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
      motivo_cancelamento: motivo,
      prazo_cancelamento_em: null,
    })
    .eq("id_aluno", l.id_aluno);

  await admin
    .from("rematricula_2027_alteracoes")
    .insert({
      id_aluno: l.id_aluno,
      campo: "cancelamento",
      valor_anterior: "em_andamento",
      valor_novo: `cancelada: ${motivo}`,
    })
    .then(() => null, () => null);

  await admin
    .rpc("notificar_admin", {
      _setor: "rematricula",
      _tipo: "rematricula_cancelada",
      _titulo: "Rematrícula cancelada automaticamente",
      _descricao: `${l.nome_aluno} — ${motivo}`,
      _link: "/rematricula2027/followup",
      _ref_id: String(l.id_aluno),
    })
    .then(() => null, () => null);

  const env = await enviarCancelamento(l, "falta de pagamento no prazo");
  await admin.from("rematricula_2027_followup_envios").upsert(
    {
      id_aluno: l.id_aluno,
      etapa: "cancelada",
      sequencia: 0,
      template: "rematricula2027_cancelada",
      destino: env.destino,
      sucesso: env.sucesso,
      payload: env.payload as any,
      enviado_em: agora,
    },
    { onConflict: "id_aluno,etapa,sequencia" },
  );
}

async function registrar(
  admin: any,
  id_aluno: number,
  etapa: string,
  sequencia: number,
  template: string,
  env: { sucesso: boolean; destino: string | null; payload: unknown },
) {
  await admin.from("rematricula_2027_followup_envios").upsert(
    {
      id_aluno,
      etapa,
      sequencia,
      template,
      destino: env.destino,
      sucesso: env.sucesso,
      payload: env.payload as any,
      enviado_em: new Date().toISOString(),
    },
    { onConflict: "id_aluno,etapa,sequencia" },
  );
}

async function paramsDe(etapa: EtapaFollowup, seq: number, l: Linha) {
  const dest = destinatario(l);
  const base = [dest.nome, l.nome_aluno];
  if (etapa !== "pagar") return base;
  const valor = brl(l.valor_com_desconto);
  if (seq < 3) return [...base, valor];
  const limite = new Date(Date.now() + PRAZO_CANCELAMENTO_DIAS * DIA_MS);
  return [...base, valor, dataBR(limite)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supaUrl, service);

    const body = await req.json().catch(() => ({} as any));
    const modo = String(body.modo || "cron");

    // ---------- modo manual (painel) ----------
    if (modo === "manual") {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const userClient = createClient(supaUrl, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return json({ error: "unauthorized" }, 401);
      const { data: ok } = await admin.rpc("has_setor", {
        _user_id: userData.user.id,
        _setor: "rematricula",
      });
      if (!ok) return json({ error: "forbidden" }, 403);

      const idAluno = Number(body.id_aluno);
      const seq = Number(body.sequencia);
      if (!Number.isFinite(idAluno) || ![1, 2, 3].includes(seq)) {
        return json({ error: "invalid_input" }, 400);
      }

      const { data: l } = await admin
        .from("alunos_rematricula_2027")
        .select(CAMPOS)
        .eq("id_aluno", idAluno)
        .maybeSingle();
      if (!l) return json({ error: "not_found" }, 404);

      const linha = l as unknown as Linha;
      const { count } = await admin
        .from("rematricula_2027_alteracoes")
        .select("id", { count: "exact", head: true })
        .eq("id_aluno", idAluno);
      const etapa = (body.etapa as EtapaFollowup) || etapaDe(linha, count ?? 0);
      if (!etapa) return json({ error: "sem_etapa" }, 400);

      const template = templateDe(etapa, seq);
      const env = await enviarFollowup({
        aluno: linha,
        etapa,
        sequencia: seq,
        template,
        params: await paramsDe(etapa, seq, linha),
        link: linha.checkout_url || undefined,
      });
      await registrar(admin, idAluno, etapa, seq, template, env);
      return json({ ok: env.sucesso, destino: env.destino, template });
    }

    // ---------- modo cron ----------
    const somenteAluno = Number(body.id_aluno) || null;
    let q = admin
      .from("alunos_rematricula_2027")
      .select(CAMPOS)
      .eq("rematricula_liberada", true)
      .eq("cancelada", false)
      .eq("followup_pausado", false)
      .neq("rematricula_concluida", true);
    if (somenteAluno) q = q.eq("id_aluno", somenteAluno);
    const { data, error } = await q;
    if (error) throw error;

    const linhas = (data as unknown as Linha[]) ?? [];
    const ids = linhas.map((l) => l.id_aluno);

    const { data: alteracoes } = await admin
      .from("rematricula_2027_alteracoes")
      .select("id_aluno")
      .in("id_aluno", ids.length ? ids : [-1]);
    const contAlt = new Map<number, number>();
    (alteracoes ?? []).forEach((a: any) =>
      contAlt.set(a.id_aluno, (contAlt.get(a.id_aluno) ?? 0) + 1),
    );

    const { data: envios } = await admin
      .from("rematricula_2027_followup_envios")
      .select("id_aluno, etapa, sequencia")
      .in("id_aluno", ids.length ? ids : [-1]);
    const jaEnviado = new Set(
      (envios ?? []).map((e: any) => `${e.id_aluno}|${e.etapa}|${e.sequencia}`),
    );

    const resultado = { enviados: 0, cancelados: 0, detalhes: [] as unknown[] };

    for (const l of linhas) {
      // 1) cancelamento por prazo vencido
      if (
        l.prazo_cancelamento_em &&
        new Date(l.prazo_cancelamento_em).getTime() <= Date.now() &&
        l.contrato_assinado &&
        !l.rematricula_concluida &&
        !l.isentar_valor_rematricula
      ) {
        await cancelarAluno(admin, l, "Cancelamento automático por falta de pagamento");
        resultado.cancelados++;
        resultado.detalhes.push({ id_aluno: l.id_aluno, acao: "cancelada" });
        continue;
      }

      const etapa = etapaDe(l, contAlt.get(l.id_aluno) ?? 0);
      if (!etapa) continue;
      if (etapa === "pagar" && l.isentar_valor_rematricula) continue;

      const dias = diasDesde(l.updated_at || l.created_at) ?? 0;

      // próxima sequência devida
      let seq = 0;
      for (const s of [1, 2, 3]) {
        if (jaEnviado.has(`${l.id_aluno}|${etapa}|${s}`)) continue;
        if (dias >= CADENCIA_DIAS[s]) seq = s;
        break;
      }
      if (!seq) continue;

      const template = templateDe(etapa, seq);
      const env = await enviarFollowup({
        aluno: l,
        etapa,
        sequencia: seq,
        template,
        params: await paramsDe(etapa, seq, l),
        link: l.checkout_url || undefined,
      });
      await registrar(admin, l.id_aluno, etapa, seq, template, env);
      resultado.enviados++;
      resultado.detalhes.push({ id_aluno: l.id_aluno, etapa, sequencia: seq, ok: env.sucesso });

      // aviso final da etapa de pagamento inicia o prazo de cancelamento
      if (etapa === "pagar" && seq === 3 && env.sucesso) {
        await admin
          .from("alunos_rematricula_2027")
          .update({
            prazo_cancelamento_em: new Date(
              Date.now() + PRAZO_CANCELAMENTO_DIAS * DIA_MS,
            ).toISOString(),
          })
          .eq("id_aluno", l.id_aluno);
      }
    }

    console.log("[rematricula-2027-followup]", JSON.stringify(resultado));
    return json({ ok: true, ...resultado });
  } catch (e) {
    console.error("[rematricula-2027-followup]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
