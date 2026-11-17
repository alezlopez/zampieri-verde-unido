import { formatarDataHora } from "./prematricula-mensagens.ts";
import { dataSp, Slot, TZ } from "./prematricula-slots.ts";

/** Visitas podem ser marcadas com até duas semanas de antecedência. */
export const DIAS_VISITA = 14;

interface Regra {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  capacidade: number;
}

export interface SlotVisita extends Slot {
  capacidade: number;
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

/** Horários livres de visita: regras ativas, menos dias bloqueados e horários lotados. */
// deno-lint-ignore no-explicit-any
export async function gerarSlotsVisita(admin: any): Promise<SlotVisita[]> {
  const [{ data: regras, error: e1 }, { data: bloqueios, error: e2 }, { data: reservas, error: e3 }] = await Promise.all([
    admin.from("visita_agenda_regras").select("*").eq("ativo", true),
    admin.from("visita_agenda_bloqueios").select("data").gte("data", dataSp(0)),
    admin.from("visitas").select("inicio").eq("status", "agendada").gte("inicio", new Date().toISOString()),
  ]);
  if (e1 || e2 || e3) throw e1 || e2 || e3;

  const bloqueadas = new Set((bloqueios ?? []).map((b: { data: string }) => b.data));
  const ocupacao = new Map<string, number>();
  for (const r of (reservas ?? []) as { inicio: string }[]) {
    const k = new Date(r.inicio).toISOString();
    ocupacao.set(k, (ocupacao.get(k) || 0) + 1);
  }

  // Antecedência mínima de 2 horas para a secretaria se organizar
  const limite = Date.now() + 2 * 3600000;
  const slots: SlotVisita[] = [];
  for (let i = 0; i < DIAS_VISITA; i++) {
    const dia = dataSp(i);
    if (bloqueadas.has(dia)) continue;
    const dow = new Date(`${dia}T12:00:00${TZ}`).getUTCDay();
    for (const regra of ((regras ?? []) as Regra[]).filter((r) => r.dia_semana === dow)) {
      const ini = minutos(regra.hora_inicio);
      const fim = minutos(regra.hora_fim);
      for (let m = ini; m + regra.duracao_min <= fim; m += regra.duracao_min) {
        const inicio = paraIso(dia, m);
        if (new Date(inicio).getTime() < limite) continue;
        if ((ocupacao.get(inicio) || 0) >= regra.capacidade) continue;
        if (slots.some((s) => s.inicio === inicio)) continue;
        slots.push({ inicio, fim: paraIso(dia, m + regra.duracao_min), texto: formatarDataHora(inicio), capacidade: regra.capacidade });
      }
    }
  }
  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
