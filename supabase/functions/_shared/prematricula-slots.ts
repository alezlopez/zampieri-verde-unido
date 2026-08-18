import { formatarDataHora } from "./prematricula-mensagens.ts";

export const TZ = "-03:00";
export const DIAS_A_FRENTE = 7;

export interface Slot {
  inicio: string;
  fim: string;
  texto: string;
}

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
export const dataSp = (offsetDias: number) => {
  const agora = new Date(Date.now() + offsetDias * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
};

/**
 * Monta os horários livres a partir das regras, bloqueios e reservas ativas.
 * `ignorarPrematriculaId` libera o horário atualmente ocupado pela própria
 * pré-matrícula (necessário no reagendamento).
 */
// deno-lint-ignore no-explicit-any
export async function gerarSlots(admin: any, ignorarPrematriculaId?: string): Promise<Slot[]> {
  const [{ data: regras }, { data: bloqueios }, { data: reservas }] = await Promise.all([
    admin.from("prematricula_agenda_regras").select("*").eq("ativo", true),
    admin.from("prematricula_agenda_bloqueios").select("data").gte("data", dataSp(0)),
    admin
      .from("prematricula_agendamentos")
      .select("inicio, prematricula_id")
      .eq("status", "agendado")
      .gte("inicio", new Date().toISOString()),
  ]);

  const bloqueadas = new Set((bloqueios ?? []).map((b: { data: string }) => b.data));
  const ocupacao = new Map<string, number>();
  (reservas ?? [])
    .filter(
      (r: { prematricula_id: string }) =>
        !ignorarPrematriculaId || r.prematricula_id !== ignorarPrematriculaId,
    )
    .forEach((r: { inicio: string }) => {
      const k = new Date(r.inicio).toISOString();
      ocupacao.set(k, (ocupacao.get(k) || 0) + 1);
    });

  const agoraMs = Date.now();
  const slots: Slot[] = [];
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
  return slots;
}
