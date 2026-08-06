import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { formatarDataHora, notificar } from "../_shared/prematricula-mensagens.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TZ = "-03:00";
const DIAS_A_FRENTE = 45;

interface Regra {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  capacidade: number;
  ativo: boolean;
}

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

const paraIso = (dataYmd: string, min: number) => {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return new Date(`${dataYmd}T${h}:${m}:00${TZ}`).toISOString();
};

/** Data (yyyy-mm-dd) em São Paulo somando N dias a partir de hoje. */
const dataSp = (offsetDias: number) => {
  const agora = new Date(Date.now() + offsetDias * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const acao = String(body?.acao || "info");
    if (token.length < 20) return json({ error: "token_invalido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pm, error: erroPm } = await admin
      .from("prematriculas")
      .select("id, protocolo, resp_nome, resp_email, resp_whatsapp, aluno_nome, status")
      .eq("token", token)
      .maybeSingle();
    if (erroPm) throw erroPm;
    if (!pm) return json({ error: "token_invalido" }, 404);

    const { data: agAtual } = await admin
      .from("prematricula_agendamentos")
      .select("inicio, fim")
      .eq("prematricula_id", pm.id)
      .eq("status", "agendado")
      .maybeSingle();

    const resumo = {
      protocolo: pm.protocolo,
      aluno_nome: pm.aluno_nome,
      resp_nome: pm.resp_nome,
      status: pm.status,
      agendamento: agAtual
        ? { inicio: agAtual.inicio, texto: formatarDataHora(agAtual.inicio) }
        : null,
    };

    if (pm.status === "reprovado") return json({ ok: true, ...resumo, slots: [] });

    // Monta os horários livres a partir das regras, bloqueios e reservas
    const [{ data: regras }, { data: bloqueios }, { data: reservas }] = await Promise.all([
      admin.from("prematricula_agenda_regras").select("*").eq("ativo", true),
      admin.from("prematricula_agenda_bloqueios").select("data").gte("data", dataSp(0)),
      admin
        .from("prematricula_agendamentos")
        .select("inicio")
        .eq("status", "agendado")
        .gte("inicio", new Date().toISOString()),
    ]);

    const bloqueadas = new Set((bloqueios ?? []).map((b: { data: string }) => b.data));
    const ocupacao = new Map<string, number>();
    (reservas ?? []).forEach((r: { inicio: string }) => {
      const k = new Date(r.inicio).toISOString();
      ocupacao.set(k, (ocupacao.get(k) || 0) + 1);
    });

    const agoraMs = Date.now();
    const slots: { inicio: string; fim: string; texto: string }[] = [];
    for (let i = 0; i < DIAS_A_FRENTE && slots.length < 400; i++) {
      const dia = dataSp(i);
      if (bloqueadas.has(dia)) continue;
      const dow = new Date(`${dia}T12:00:00${TZ}`).getUTCDay();
      const doDia = (regras ?? []).filter((r: Regra) => r.dia_semana === dow);
      for (const regra of doDia) {
        const ini = minutos(regra.hora_inicio);
        const fim = minutos(regra.hora_fim);
        for (let m = ini; m + regra.duracao_min <= fim; m += regra.duracao_min) {
          const inicioIso = paraIso(dia, m);
          if (new Date(inicioIso).getTime() < agoraMs + 2 * 3600000) continue;
          if ((ocupacao.get(inicioIso) || 0) >= regra.capacidade) continue;
          slots.push({
            inicio: inicioIso,
            fim: paraIso(dia, m + regra.duracao_min),
            texto: formatarDataHora(inicioIso),
          });
        }
      }
    }
    slots.sort((a, b) => a.inicio.localeCompare(b.inicio));

    if (acao === "info") return json({ ok: true, ...resumo, slots });

    if (acao === "agendar") {
      if (pm.status !== "aprovado_aguardando_agendamento") {
        return json({ error: "status_invalido", status: pm.status }, 400);
      }
      const inicio = String(body?.inicio || "");
      const escolhido = slots.find((s) => s.inicio === inicio);
      if (!escolhido) return json({ error: "horario_indisponivel" }, 409);

      const { error: erroIns } = await admin.from("prematricula_agendamentos").insert({
        prematricula_id: pm.id,
        inicio: escolhido.inicio,
        fim: escolhido.fim,
      });
      if (erroIns) throw erroIns;

      const { error: erroUp } = await admin
        .from("prematriculas")
        .update({ status: "entrevista_agendada", agendado_em: new Date().toISOString() })
        .eq("id", pm.id);
      if (erroUp) throw erroUp;

      await notificar("agendada", {
        respNome: pm.resp_nome,
        respEmail: pm.resp_email,
        respWhatsapp: pm.resp_whatsapp,
        alunoNome: pm.aluno_nome,
        protocolo: pm.protocolo,
        dataEntrevista: escolhido.texto,
      });

      return json({
        ok: true,
        status: "entrevista_agendada",
        agendamento: { inicio: escolhido.inicio, texto: escolhido.texto },
      });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("prematricula-agenda erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
