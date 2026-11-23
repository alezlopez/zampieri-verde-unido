/**
 * Turmas do cadastro de alunos (alunos_26.curso), ex.: "Ensino Fundamental II - 7º Ano C".
 * Usado para restringir eventos/excursões a certas turmas (eventos.turmas_permitidas).
 * O nome curto ("1º Ano A") se repete entre segmentos, então a chave é sempre o texto completo.
 */

export interface TurmaInfo {
  curso: string;
  segmento: string;
  /** Série sem a letra, ex.: "7º Ano" */
  serie: string;
  /** Nome curto, ex.: "7º Ano C" */
  curta: string;
}

const ORDEM_SEGMENTOS = ["Educação Infantil", "Ensino Fundamental I", "Ensino Fundamental II", "Ensino Médio"];

export function infoTurma(curso: string): TurmaInfo {
  const [seg, resto] = curso.includes(" - ") ? curso.split(/ - (.+)/) : ["Outros", curso];
  const curta = (resto ?? curso).trim();
  const serie = curta.replace(/\s+[A-Z]$/, "").trim();
  return { curso, segmento: seg.trim(), serie, curta };
}

const numero = (s: string) => parseInt(s.match(/\d+/)?.[0] ?? "0", 10);

export function ordenarTurmas(cursos: string[]): TurmaInfo[] {
  return cursos.map(infoTurma).sort((a, b) => {
    const sa = ORDEM_SEGMENTOS.indexOf(a.segmento);
    const sb = ORDEM_SEGMENTOS.indexOf(b.segmento);
    if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
    const na = numero(a.serie);
    const nb = numero(b.serie);
    if (na !== nb) return na - nb;
    return a.curta.localeCompare(b.curta, "pt-BR");
  });
}

/** Agrupa por segmento e, dentro dele, por série. */
export function agruparTurmas(cursos: string[]) {
  const grupos: { segmento: string; series: { serie: string; turmas: TurmaInfo[] }[] }[] = [];
  for (const t of ordenarTurmas(cursos)) {
    let g = grupos.find((x) => x.segmento === t.segmento);
    if (!g) grupos.push((g = { segmento: t.segmento, series: [] }));
    let s = g.series.find((x) => x.serie === t.serie);
    if (!s) g.series.push((s = { serie: t.serie, turmas: [] }));
    s.turmas.push(t);
  }
  return grupos;
}

/** Evento sem lista (ou lista vazia) aceita todas as turmas. */
export function eventoRestrito(turmas: string[] | null | undefined): turmas is string[] {
  return Array.isArray(turmas) && turmas.length > 0;
}

export function turmaPermitida(turmas: string[] | null | undefined, curso: string | null | undefined): boolean {
  if (!eventoRestrito(turmas)) return true;
  return !!curso && turmas.includes(curso);
}

const SEG_CURTO: Record<string, string> = {
  "Educação Infantil": "Infantil",
  "Ensino Fundamental I": "Fund. I",
  "Ensino Fundamental II": "Fund. II",
  "Ensino Médio": "Médio",
};

/**
 * Texto curto para famílias, ex.: "4º e 5º Ano (Fund. I)" ou "Fund. II e Médio".
 * Segmento inteiro marcado vira só o nome do segmento; série inteira vira a série; senão, a turma.
 * `todas` é a lista completa de turmas existentes (para saber se um segmento/série está completo).
 */
export function resumoTurmas(turmas: string[], todas: string[]): string {
  const sel = new Set(turmas);
  const partes: string[] = [];
  for (const g of agruparTurmas(todas.length ? Array.from(new Set([...todas, ...turmas])) : turmas)) {
    const doSegmento = g.series.flatMap((s) => s.turmas);
    const marcadas = doSegmento.filter((t) => sel.has(t.curso));
    if (!marcadas.length) continue;
    const seg = SEG_CURTO[g.segmento] ?? g.segmento;
    if (marcadas.length === doSegmento.length) {
      partes.push(g.segmento === "Educação Infantil" || g.segmento === "Ensino Médio" ? g.segmento : g.segmento.replace("Ensino ", ""));
      continue;
    }
    const itens: string[] = [];
    for (const s of g.series) {
      const m = s.turmas.filter((t) => sel.has(t.curso));
      if (!m.length) continue;
      if (m.length === s.turmas.length) itens.push(s.serie);
      else itens.push(...m.map((t) => t.curta));
    }
    partes.push(`${juntar(itens)} (${seg})`);
  }
  return juntar(partes);
}

function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}
