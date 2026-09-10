/**
 * Catálogo único dos motivos de reprovação / aprovação com ressalvas
 * da pré-matrícula. Espelho de supabase/functions/_shared/prematricula-motivos.ts
 */

export type DecisaoMotivo = "reprovar" | "ressalvas";

export interface MotivoPrematricula {
  codigo: string;
  titulo: string;
  texto: string;
  solucao: string;
  decisoes: DecisaoMotivo[];
  documento: "boletim" | "laudo" | null;
}

export const MOTIVOS: MotivoPrematricula[] = [
  {
    codigo: "financeiro",
    titulo: "Financeiro",
    texto:
      "Um dos critérios para realizar a matrícula do Colégio Zampieri, é estar com o CPF sem registros nos orgãos de proteção ao crédito (SPC e SERASA).",
    solucao:
      "Desta forma, você pode preencher novamente o formulário com o CPF do outro responsável financeiro pelo aluno (pai ou mãe). Clique no botão abaixo.",
    decisoes: ["reprovar"],
    documento: null,
  },
  {
    codigo: "laudo",
    titulo: "Laudo não enviado",
    texto:
      "Foi selecionado que existe acompanhamento médico concluído ou em andamento, mas o laudo não foi encaminhado ou encaminhado de forma erronea.",
    solucao: "Desta forma, você pode reenviar o documento clicando no botão abaixo.",
    decisoes: ["reprovar", "ressalvas"],
    documento: "laudo",
  },
  {
    codigo: "boletim",
    titulo: "Boletim não enviado",
    texto:
      "Não conseguimos identificar o boletim de notas atual, ele pode ter sido enviado de forma incompleta ou estar desatualizado.",
    solucao: "Desta forma, você pode reenviar o documento clicando no botão abaixo.",
    decisoes: ["reprovar", "ressalvas"],
    documento: "boletim",
  },
];

export const acharMotivo = (codigo?: string | null) =>
  MOTIVOS.find((m) => m.codigo === codigo) || null;
