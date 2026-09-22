// Follow-up das matrículas de alunos novos.
// - modo cron: roda de hora em hora e dispara as mensagens devidas.
// - modo manual: o painel reenvia uma mensagem específica.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  cadenciaDe,
  CasoFollowup,
  enviarFollowupMatricula,
  EtapaMatricula,
  etapaDe,
  ultimaAtividade,
} from "../_shared/matricula-followup.ts";

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

const jaEnviou = (c: CasoFollowup, etapa: string, seq: number) =>
  (c.envios || []).some((e) => e.etapa === etapa && Number(e.sequencia) === seq);

async function registrar(
  admin: any,
  c: CasoFollowup,
  etapa: string,
  sequencia: number,
  r: { sucesso: boolean; destino: string | null; template: string; payload: unknown },
) {
  await admin.from("matricula_followup_envios").upsert(
    {
      prematricula_id: c.id,
      etapa,
      sequencia,
      template: r.template,
      destino: r.destino,
      sucesso: r.sucesso,
      payload: r.payload as any,
      enviado_em: new Date().toISOString(),
    },
    { onConflict: "prematricula_id,etapa,sequencia" },
  );
}

/** Qual sequência está devida agora (ou null). */
function sequenciaDevida(c: CasoFollowup, etapa: EtapaMatricula): number | null {
  if (etapa === "lembrete") {
    if (!c.entrevista_inicio) return null;
    // Ao agendar a família já recebe um aviso: só lembra quem marcou
    // com pelo menos 3 dias de antecedência.
    const marcadoEm = c.agendado_em || c.updated_at || c.created_at;
    if (!marcadoEm) return null;
    const antecedencia =
      (new Date(c.entrevista_inicio).getTime() - new Date(marcadoEm).getTime()) / 86400000;
    if (antecedencia < 3) return null;
    const horas = (new Date(c.entrevista_inicio).getTime() - Date.now()) / 3600000;
    if (horas <= 26 && horas > 2 && !jaEnviou(c, etapa, 1)) return 1;
    return null;
  }
  if (etapa === "faltou") return jaEnviou(c, etapa, 1) ? null : 1;

  // Etapas diárias: cadência em dias desde a última atividade
  // (agendar começa em 3 dias, pois a aprovação já avisa a família).
  const cadencia = cadenciaDe(etapa);
  const dias = diasDesde(ultimaAtividade(c, etapa));
  if (dias === null) return null;
  for (const seq of [3, 2, 1]) {
    if (dias >= cadencia[seq] && !jaEnviou(c, etapa, seq)) return seq;
  }
  return null;
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

    const { data: lista, error } = await admin.rpc("matricula_followup_cron_lista");
    if (error) throw error;
    const casos = (lista ?? []) as CasoFollowup[];

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
        _setor: "matricula",
      });
      if (!ok) return json({ error: "forbidden" }, 403);

      const id = String(body.id || "");
      const etapa = String(body.etapa || "") as EtapaMatricula;
      const seq = Number(body.sequencia || 1);
      const caso = casos.find((c) => c.id === id);
      if (!caso) return json({ error: "not_found" }, 404);

      const r = await enviarFollowupMatricula(caso, etapa, seq);
      await registrar(admin, caso, etapa, seq, r);
      return json({ ok: r.sucesso, destino: r.destino, template: r.template });
    }

    // ---------- cron ----------
    if (Deno.env.get("MATRICULA_FOLLOWUP_ATIVO") !== "true") {
      return json({ ok: true, desligado: true, elegiveis: casos.length });
    }

    let enviados = 0;
    const falhas: string[] = [];
    for (const c of casos) {
      const etapa = etapaDe(c);
      if (!etapa) continue;
      // Só cobra agendamento se houver vaga para aluno novo na série/turno.
      if (etapa === "agendar" && c.sem_vaga) continue;
      const seq = sequenciaDevida(c, etapa);
      if (!seq) continue;
      const r = await enviarFollowupMatricula(c, etapa, seq);
      await registrar(admin, c, etapa, seq, r);
      if (r.sucesso) enviados++;
      else falhas.push(`${c.aluno_nome} (${etapa}/${seq})`);
    }

    return json({ ok: true, elegiveis: casos.length, enviados, falhas });
  } catch (e) {
    console.error("matricula-followup erro:", e);
    return json({ error: String(e) }, 500);
  }
});
