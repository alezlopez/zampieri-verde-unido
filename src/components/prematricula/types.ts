export const SERIES = [
  "Infantil 5 (Pré-Escola)",
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "1ª série do Ensino Médio",
  "2ª série do Ensino Médio",
  "3ª série do Ensino Médio",
];


/** Ano letivo de referência para o corte etário (31/03) */
export const ANO_LETIVO_REFERENCIA = 2027;

/** Idade mínima (completa até 31/03 do ano de referência) exigida por série */
export const IDADE_MINIMA_SERIE: Record<string, number> = SERIES.reduce(
  (acc, serie, i) => ({ ...acc, [serie]: i + 5 }),
  {} as Record<string, number>,
);

/** Idade completa em 31/03 do ano de referência. Recebe data ISO (aaaa-mm-dd). */
export const idadeEm31Marco = (
  nascIso: string,
  ano = ANO_LETIVO_REFERENCIA,
): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascIso || "")) return null;
  const [a, m, d] = nascIso.split("-").map(Number);
  const nasc = new Date(Date.UTC(a, m - 1, d));
  if (Number.isNaN(nasc.getTime())) return null;
  const corte = new Date(Date.UTC(ano, 2, 31));
  let idade = ano - a;
  const aniversarioNoAno = new Date(Date.UTC(ano, m - 1, d));
  if (aniversarioNoAno > corte) idade -= 1;
  return idade;
};

/** Séries permitidas: a compatível com a idade e todas as anteriores. */
export const seriesPermitidas = (
  nascIso: string,
  ano = ANO_LETIVO_REFERENCIA,
): string[] => {
  const idade = idadeEm31Marco(nascIso, ano);
  if (idade === null || idade < 5 || idade >= 18) return [];
  return SERIES.filter((s) => IDADE_MINIMA_SERIE[s] <= idade);
};

export const ETAPAS = [
  "Dados do Responsável",
  "Dados do Aluno",
  "Histórico Acadêmico",
  "Desenvolvimento e Comportamento",
  "Saúde e Apoio",
  "Consentimento",
];

export interface PreMatriculaForm {
  resp_tipo: string;
  resp_nome: string;
  resp_email: string;
  resp_cpf: string;
  resp_whatsapp: string;
  aluno_nome: string;
  aluno_nascimento: string; // dd/mm/aaaa
  serie_pretendida: string;
  turno_preferencia: string;
  escola_atual: string;
  tipo_escola: string;
  repetiu_ano: string;
  dificuldade_aprendizagem: string;
  atendimento_complementar: string;
  dificuldade_atencao: string;
  diagnostico: string;
  diagnostico_detalhe: string;
  dificuldade_socializacao: string;
  usa_medicacao: string;
  medicacao_detalhe: string;
  alergias: string;
  observacoes_saude: string;
  consentimento_veracidade: boolean;
  consentimento_privacidade: boolean;
}

export const formVazio = (): PreMatriculaForm => ({
  resp_tipo: "",
  resp_nome: "",
  resp_email: "",
  resp_cpf: "",
  resp_whatsapp: "",
  aluno_nome: "",
  aluno_nascimento: "",
  serie_pretendida: "",
  turno_preferencia: "",
  escola_atual: "",
  tipo_escola: "",
  repetiu_ano: "",
  dificuldade_aprendizagem: "",
  atendimento_complementar: "",
  dificuldade_atencao: "",
  diagnostico: "",
  diagnostico_detalhe: "",
  dificuldade_socializacao: "",
  usa_medicacao: "",
  medicacao_detalhe: "",
  alergias: "",
  observacoes_saude: "",
  consentimento_veracidade: false,
  consentimento_privacidade: false,
});

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado_aguardando_agendamento: "Aprovado - Aguardando agendamento",
  reprovado: "Reprovado",
  entrevista_agendada: "Entrevista agendada",
  entrevista_concluida: "Entrevista concluída",
};
