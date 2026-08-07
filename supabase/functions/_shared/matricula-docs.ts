/** Checklist de documentos exigidos na matrícula. */
export const DOCUMENTOS = [
  { tipo: "foto_3x4", label: "2 fotos 3x4 recentes", obrigatorio: true },
  { tipo: "certidao_nascimento", label: "Certidão de nascimento do aluno", obrigatorio: true },
  { tipo: "rg_cpf_aluno", label: "RG e CPF do aluno", obrigatorio: true },
  { tipo: "carteira_vacina", label: "Carteira de vacinação", obrigatorio: true },
  { tipo: "comprovante_residencia", label: "Comprovante de residência", obrigatorio: true },
  { tipo: "rg_cpf_pais", label: "RG e CPF dos pais/responsáveis", obrigatorio: true },
  { tipo: "historico_escolar", label: "Histórico escolar / declaração de transferência", obrigatorio: true },
] as const;

export const TIPOS_VALIDOS = DOCUMENTOS.map((d) => d.tipo) as string[];

export const labelDoc = (tipo: string) =>
  DOCUMENTOS.find((d) => d.tipo === tipo)?.label ?? tipo;
