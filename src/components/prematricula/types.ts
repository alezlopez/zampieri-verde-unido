export const SERIES = [
  "Berçário",
  "Infantil 1",
  "Infantil 2",
  "Infantil 3",
  "Infantil 4",
  "Infantil 5",
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
