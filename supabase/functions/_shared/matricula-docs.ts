/** Checklist de documentos exigidos na matrícula. */
export const DOCUMENTOS = [
  { tipo: "foto_3x4", label: "2 fotos 3x4 recentes", obrigatorio: true, permite_aguardando: false },
  { tipo: "certidao_nascimento", label: "Certidão de nascimento do aluno", obrigatorio: true, permite_aguardando: false },
  { tipo: "rg_cpf_aluno", label: "RG e CPF do aluno", obrigatorio: true, permite_aguardando: false },
  { tipo: "carteira_vacina", label: "Carteira de vacinação", obrigatorio: true, permite_aguardando: false },
  { tipo: "comprovante_residencia", label: "Comprovante de residência", obrigatorio: true, permite_aguardando: false },
  { tipo: "rg_cpf_pai", label: "RG e CPF do pai", obrigatorio: false, permite_aguardando: false },
  { tipo: "rg_cpf_mae", label: "RG e CPF da mãe", obrigatorio: false, permite_aguardando: false },
  { tipo: "historico_escolar", label: "Histórico escolar", obrigatorio: true, permite_aguardando: true },
  { tipo: "declaracao_transferencia", label: "Declaração de transferência", obrigatorio: true, permite_aguardando: false },
] as const;

export const TIPOS_VALIDOS = DOCUMENTOS.map((d) => d.tipo) as string[];

export const PERMITE_AGUARDANDO = DOCUMENTOS.filter((d) => d.permite_aguardando).map((d) => d.tipo) as string[];

/** Só pode enviar/reenviar arquivo quando nada foi aceito ainda ou a escola pediu reenvio. */
export const podeReenviar = (status?: string | null) =>
  !status || status === "pendente" || status === "rejeitado";

export const labelDoc = (tipo: string) =>
  DOCUMENTOS.find((d) => d.tipo === tipo)?.label ?? tipo;

/**
 * Obrigatoriedade considerando quem é o responsável da pré-matrícula:
 * o documento do pai ou da mãe correspondente é obrigatório, o outro é opcional.
 */
export const docObrigatorio = (tipo: string, respTipo?: string | null) => {
  if (tipo === "rg_cpf_pai") return respTipo !== "mae";
  if (tipo === "rg_cpf_mae") return respTipo !== "pai";
  return DOCUMENTOS.find((d) => d.tipo === tipo)?.obrigatorio ?? false;
};
