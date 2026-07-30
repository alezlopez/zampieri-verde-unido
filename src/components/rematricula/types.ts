export interface AlunoResumo {
  id_aluno: number;
  nome_aluno: string;
  curso_atual: string | null;
  curso_2027: string | null;
}

export interface AlunoCompleto {
  id_aluno: number;
  nome_aluno: string;
  cpf_aluno: string | null;
  data_nascimento_aluno: string;
  curso_atual: string | null;
  curso_2027: string | null;
  valor_cheio: number | null;
  valor_com_desconto: number | null;
  percentual_desconto: number | null;
  dia_vencimento: number | null;
  responsavel_financeiro: string | null;
  turno_escolhido: string | null;
  tem_pai: string | null;
  nome_pai: string | null;
  cpf_pai: string | null;
  rg_pai: string | null;
  estado_civil_pai: string | null;
  naturalidade_pai: string | null;
  nacionalidade_pai: string | null;
  cep_pai: string | null;
  logradouro_pai: string | null;
  numero_pai: string | null;
  complemento_pai: string | null;
  cidade_pai: string | null;
  estado_pai: string | null;
  data_nascimento_pai: string | null;
  celular_pai: string | null;
  email_pai: string | null;
  tem_mae: string | null;
  nome_mae: string | null;
  cpf_mae: string | null;
  rg_mae: string | null;
  estado_civil_mae: string | null;
  naturalidade_mae: string | null;
  nacionalidade_mae: string | null;
  cep_mae: string | null;
  logradouro_mae: string | null;
  numero_mae: string | null;
  complemento_mae: string | null;
  cidade_mae: string | null;
  estado_mae: string | null;
  data_nascimento_mae: string | null;
  celular_mae: string | null;
  email_mae: string | null;
  valor_rematricula: number | null;
}

/** Campos de um responsável, sem o sufixo _pai/_mae */
export interface ResponsavelForm {
  nome: string;
  cpf: string;
  rg: string;
  estado_civil: string;
  naturalidade: string;
  nacionalidade: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  data_nascimento: string; // dd/mm/aaaa
  celular: string;
  email: string;
}

export const emptyResponsavel = (): ResponsavelForm => ({
  nome: "",
  cpf: "",
  rg: "",
  estado_civil: "",
  naturalidade: "",
  nacionalidade: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  data_nascimento: "",
  celular: "",
  email: "",
});

export interface TurnoDisponivel {
  turno: string;
  max_vagas: number;
  ocupadas: number;
  disponiveis: number;
  disponivel: boolean;
}
