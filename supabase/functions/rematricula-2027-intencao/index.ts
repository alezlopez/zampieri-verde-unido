// Pesquisa de intenção da Rematrícula 2027 (mensagem com botões).
// - modo cron: dispara a pergunta inicial e os lembretes conforme a cadência.
// - modo manual: painel reenvia um tipo específico para um aluno.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dataBR } from "../_shared/rematricula-followup.ts";
import {
  CADENCIA_INDECISO,
  CADENCIA_SEM_RESPOSTA,
  CAMPOS_INTENCAO,
  enviarIntencao,
  TEMPLATE_INTENCAO,
  TipoIntencao,
} from "../_shared/rematricula-intencao.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DIA_MS = 86400000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const diasDesde = (iso: string | null | undefined) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DIA_MS) : null;

async function registrar(
  admin: any,
  id_aluno: number,
  tipo: string,
  sequencia: number,
  template: string,
  env: { sucesso: boolean; destino: string | null; payload: unknown },
) {
  await admin.from("rematricula_2027_intencao_envios").upsert(
    {
      id_aluno,
      tipo,
      sequencia,
      template,
      destino: env.destino,
      sucesso: env.sucesso,
      payload: env.payload as any,
      enviado_em: new Date().toISOString(),
    },
    { onConflict: "id_aluno,tipo,sequencia" },
  );
  await admin
    .from("rematricula_2027_intencao")
    .upsert({ id_aluno, destino: env.destino }, { onConflict: "id_aluno" });
}

/** Prazo da fase vigente, usado como {{3}} nas mensagens. */
async function prazoFase(admin: any): Promise<string> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("rematricula_2027_fases")
    .select("fim")
    .eq("ativo", true)
    .lte("inicio", hoje)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.fim ? dataBR(new Date(`${data.fim}T12:00:00Z`)) : "o prazo atual";
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
    const prazo = await prazoFase(admin);

    // ---------- manual ----------
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
      const tipo = String(body.tipo || "pergunta") as TipoIntencao;
      const seq = Number(body.sequencia || 1);
      if (!Number.isFinite(idAluno) || !TEMPLATE_INTENCAO[tipo]) {
        return json({ error: "invalid_input" }, 400);
      }

      const { data: l } = await admin
        .from("alunos_rematricula_2027")
        .select(CAMPOS_INTENCAO)
        .eq("id_aluno", idAluno)
        .maybeSingle();
      if (!l) return json({ error: "not_found" }, 404);

      const aluno = l as any;
      const env = await enviarIntencao({
        aluno,
        tipo,
        sequencia: seq,
        params: [aluno.nome_aluno, prazo],
      });
      await registrar(admin, idAluno, tipo, seq, TEMPLATE_INTENCAO[tipo], env);
      return json({ ok: env.sucesso, destino: env.destino, template: TEMPLATE_INTENCAO[tipo] });
    }

    // ---------- cron ----------
    if (Deno.env.get("REMATRICULA_INTENCAO_ATIVA") !== "true" && !body.forcar) {
      return json({ ok: true, ignorado: "rotina_desativada" });
    }

    const somenteAluno = Number(body.id_aluno) || null;
    let q = admin
      .from("alunos_rematricula_2027")
      .select(CAMPOS_INTENCAO)
      .eq("rematricula_liberada", true)
      .eq("cancelada", false)
      .neq("rematricula_concluida", true);
    if (somenteAluno) q = q.eq("id_aluno", somenteAluno);
    const { data, error } = await q;
    if (error) throw error;

    const linhas = (data as any[]) ?? [];
    const ids = linhas.map((l) => l.id_aluno);

    const { data: intencoes } = await admin
      .from("rematricula_2027_intencao")
      .select("id_aluno, status, pausado")
      .in("id_aluno", ids.length ? ids : [-1]);
    const mapaInt = new Map<number, any>();
    (intencoes ?? []).forEach((i: any) => mapaInt.set(i.id_aluno, i));

    const { data: envios } = await admin
      .from("rematricula_2027_intencao_envios")
      .select("id_aluno, tipo, sequencia, enviado_em")
      .in("id_aluno", ids.length ? ids : [-1]);
    const porAluno = new Map<number, any[]>();
    (envios ?? []).forEach((e: any) => {
      porAluno.set(e.id_aluno, [...(porAluno.get(e.id_aluno) ?? []), e]);
    });

    const resultado = { enviados: 0, detalhes: [] as unknown[] };

    for (const l of linhas) {
      const info = mapaInt.get(l.id_aluno);
      if (info?.pausado) continue;
      const status = info?.status ?? "sem_resposta";
      if (status === "vai_rematricular" || status === "nao_vai") continue;

      const tipo: TipoIntencao = status === "indeciso" ? "lembrete" : "pergunta";
      const cadencia = status === "indeciso" ? CADENCIA_INDECISO : CADENCIA_SEM_RESPOSTA;
      const feitos = (porAluno.get(l.id_aluno) ?? []).filter((e) => e.tipo === tipo);
      const ultimoGeral = (porAluno.get(l.id_aluno) ?? [])
        .map((e) => e.enviado_em)
        .sort()
        .pop();

      let seq = 0;
      for (const s of Object.keys(cadencia).map(Number).sort()) {
        if (feitos.some((e) => e.sequencia === s)) continue;
        const dias = diasDesde(ultimoGeral);
        if (dias === null || dias >= cadencia[s]) seq = s;
        break;
      }
      if (!seq) continue;

      const env = await enviarIntencao({
        aluno: l,
        tipo,
        sequencia: seq,
        params: [l.nome_aluno, prazo],
      });
      await registrar(admin, l.id_aluno, tipo, seq, TEMPLATE_INTENCAO[tipo], env);
      resultado.enviados++;
      resultado.detalhes.push({ id_aluno: l.id_aluno, tipo, sequencia: seq, ok: env.sucesso });
    }

    console.log("[rematricula-2027-intencao]", JSON.stringify(resultado));
    return json({ ok: true, ...resultado });
  } catch (e) {
    console.error("[rematricula-2027-intencao]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
