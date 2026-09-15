// Recebe do n8n a resposta dos botões da pesquisa de intenção.
// Endpoint público protegido pelo token compartilhado com o n8n.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dataBR, LINK_REMATRICULA } from "../_shared/rematricula-followup.ts";
import {
  CAMPOS_INTENCAO,
  enviarIntencao,
  MOTIVOS,
  STATUS_VALIDOS,
  TEMPLATE_INTENCAO,
} from "../_shared/rematricula-intencao.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const esperado = Deno.env.get("N8N_WEBHOOK_TOKEN");
    if (esperado) {
      const recebido = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
      if (recebido !== esperado) return json({ error: "unauthorized" }, 401);
    }

    // aceita tanto o formato próprio quanto o payload do multiatendimento
    // ({ phone, button_text, button_payload, customer_name, ... })
    const raw = await req.json().catch(() => ({} as any));
    const body = raw?.body && typeof raw.body === "object" ? { ...raw, ...raw.body } : raw;

    const resposta = String(
      body.resposta || body.button_payload || body.button_text || "",
    ).trim();
    const motivoTexto = body.motivo_texto ? String(body.motivo_texto).trim() : null;

    // motivo: explícito ou deduzido do texto do botão
    const normaliza = (v: string) =>
      v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const rNorm = normaliza(resposta);
    const motivoDoBotao = rNorm.includes("financ")
      ? "financeiro"
      : rNorm.includes("mudanc") || rNorm.includes("cidade") || rNorm.includes("escola")
      ? "mudanca"
      : rNorm.includes("insatisf")
      ? "insatisfacao"
      : rNorm === "outro" || rNorm === "outros"
      ? "outro"
      : null;
    const motivo = body.motivo ? String(body.motivo).trim() : motivoDoBotao;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // localizar o aluno por id ou telefone
    let idAluno = Number(body.id_aluno) || null;
    if (!idAluno) {
      const tel = soDigitos(body.telefone || body.phone || body.from).slice(-11);
      if (tel.length < 10) return json({ error: "aluno_nao_identificado" }, 400);
      const { data } = await admin
        .from("alunos_rematricula_2027")
        .select("id_aluno, celular_pai, telefone_pai, celular_mae, telefone_mae")
        .or(
          [
            `celular_pai.ilike.%${tel.slice(-8)}%`,
            `telefone_pai.ilike.%${tel.slice(-8)}%`,
            `celular_mae.ilike.%${tel.slice(-8)}%`,
            `telefone_mae.ilike.%${tel.slice(-8)}%`,
          ].join(","),
        )
        .limit(2);
      if (!data?.length) return json({ error: "aluno_nao_encontrado" }, 404);
      idAluno = data[0].id_aluno;
    }

    const { data: alunoRow } = await admin
      .from("alunos_rematricula_2027")
      .select(CAMPOS_INTENCAO)
      .eq("id_aluno", idAluno)
      .maybeSingle();
    if (!alunoRow) return json({ error: "aluno_nao_encontrado" }, 404);
    const aluno = alunoRow as any;

    // normaliza a resposta vinda do botão (sem acentos)
    const r = rNorm;
    const status = (STATUS_VALIDOS as readonly string[]).includes(r)
      ? r
      : r.includes("nao_vai") || r.includes("nao vou") || r.includes("nao pretend")
      ? "nao_vai"
      : r.includes("indec") || r.includes("nao decid") || r.includes("nao sei")
      ? "indeciso"
      : r.includes("vou") || r === "sim"
      ? "vai_rematricular"
      : null;

    if (!status && !motivo) {
      return json({ error: "resposta_invalida", recebido: resposta }, 400);
    }

    const patch: Record<string, unknown> = {
      id_aluno: idAluno,
      respondido_em: new Date().toISOString(),
      origem: "whatsapp",
    };
    if (status) patch.status = status;
    if (motivo) patch.motivo = MOTIVOS[motivo] ? motivo : "outro";
    if (motivoTexto) patch.motivo_texto = motivoTexto;

    await admin
      .from("rematricula_2027_intencao")
      .upsert(patch, { onConflict: "id_aluno" });

    // ações por resposta
    if (status === "vai_rematricular") {
      const env = await enviarIntencao({
        aluno,
        tipo: "link",
        params: [aluno.nome_aluno],
        link: LINK_REMATRICULA,
      });
      await admin.from("rematricula_2027_intencao_envios").upsert(
        {
          id_aluno: idAluno,
          tipo: "link",
          sequencia: 1,
          template: TEMPLATE_INTENCAO.link,
          destino: env.destino,
          sucesso: env.sucesso,
          payload: env.payload as any,
        },
        { onConflict: "id_aluno,tipo,sequencia" },
      );
    }

    if (status === "nao_vai") {
      await admin
        .rpc("notificar_admin", {
          _setor: "rematricula",
          _tipo: "intencao_nao_vai",
          _titulo: "Família sinalizou que não vai rematricular",
          _descricao: `${aluno.nome_aluno} — contato de retenção recomendado`,
          _link: "/rematricula2027/followup",
          _ref_id: String(idAluno),
        })
        .then(() => null, () => null);

      // segundo toque: pergunta o motivo
      const env = await enviarIntencao({
        aluno,
        tipo: "motivo",
        params: [aluno.nome_aluno],
      });
      await admin.from("rematricula_2027_intencao_envios").upsert(
        {
          id_aluno: idAluno,
          tipo: "motivo",
          sequencia: 1,
          template: TEMPLATE_INTENCAO.motivo,
          destino: env.destino,
          sucesso: env.sucesso,
          payload: env.payload as any,
        },
        { onConflict: "id_aluno,tipo,sequencia" },
      );
    }

    if (motivo) {
      await admin
        .rpc("notificar_admin", {
          _setor: "rematricula",
          _tipo: "intencao_motivo",
          _titulo: "Motivo da saída informado",
          _descricao: `${aluno.nome_aluno} — ${MOTIVOS[motivo] ?? motivo}${
            motivoTexto ? `: ${motivoTexto}` : ""
          }`,
          _link: "/rematricula2027/followup",
          _ref_id: String(idAluno),
        })
        .then(() => null, () => null);
    }

    console.log(
      `[intencao-resposta] aluno=${idAluno} status=${status ?? "-"} motivo=${motivo ?? "-"} em=${dataBR(new Date())}`,
    );
    return json({ ok: true, id_aluno: idAluno, status: status ?? null });
  } catch (e) {
    console.error("[rematricula-2027-intencao-resposta]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
