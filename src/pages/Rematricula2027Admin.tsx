import { Fragment, useEffect, useMemo, useState } from "react";
import { Ban, Check, ChevronDown, ChevronUp, Loader2, Pencil, RefreshCw, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL, isValidCpf, maskCpf, maskTelefone } from "@/components/rematricula/utils";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Alteracao {
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

interface LinhaAdmin {
  id_aluno: number;
  nome_aluno: string;
  curso_atual: string | null;
  curso_2027: string | null;
  turno_escolhido: string | null;
  responsavel_financeiro: string | null;
  contrato_gerado: boolean;
  contrato_assinado: boolean;
  rematricula_concluida: boolean;
  forma_pagamento: string | null;
  parcelas: number | null;
  valor_pago: number | null;
  data_pagamento: string | null;
  link_contrato: string | null;
  numeros: string[];
  conferida: boolean;
  conferida_em: string | null;
  percentual_desconto: number | null;
  valor_com_desconto: number | null;
  valor_cheio: number | null;
  nome_pai: string | null;
  cpf_pai: string | null;
  celular_pai: string | null;
  telefone_pai: string | null;
  email_pai: string | null;
  nome_mae: string | null;
  cpf_mae: string | null;
  celular_mae: string | null;
  telefone_mae: string | null;
  email_mae: string | null;
  cancelada?: boolean;
  cancelada_em?: string | null;
  motivo_cancelamento?: string | null;
  estorno_valor?: number | null;
  estorno_em?: string | null;

  qtd_alteracoes: number;
  alteracoes: Alteracao[];

}

type Filtro = "todos" | "concluidas" | "a_conferir" | "conferidas" | "assinados" | "pendentes" | "cpf_invalido";

const LABEL_CAMPO: Record<string, string> = {
  cpf_aluno: "CPF do aluno",
  curso_2027: "Curso 2027",
  turno_escolhido: "Turno",
  responsavel_financeiro: "Responsável financeiro",
  nome_pai: "Nome do pai",
  cpf_pai: "CPF do pai",
  rg_pai: "RG do pai",
  estado_civil_pai: "Estado civil do pai",
  naturalidade_pai: "Naturalidade do pai",
  nacionalidade_pai: "Nacionalidade do pai",
  cep_pai: "CEP do pai",
  logradouro_pai: "Logradouro do pai",
  numero_pai: "Número do pai",
  complemento_pai: "Complemento do pai",
  bairro_pai: "Bairro do pai",
  cidade_pai: "Cidade do pai",
  estado_pai: "Estado do pai",
  data_nascimento_pai: "Nascimento do pai",
  celular_pai: "Celular do pai",
  telefone_pai: "Telefone do pai",
  email_pai: "E-mail do pai",

  nome_mae: "Nome da mãe",
  cpf_mae: "CPF da mãe",
  rg_mae: "RG da mãe",
  estado_civil_mae: "Estado civil da mãe",
  naturalidade_mae: "Naturalidade da mãe",
  nacionalidade_mae: "Nacionalidade da mãe",
  cep_mae: "CEP da mãe",
  logradouro_mae: "Logradouro da mãe",
  numero_mae: "Número da mãe",
  complemento_mae: "Complemento da mãe",
  bairro_mae: "Bairro da mãe",
  cidade_mae: "Cidade da mãe",
  estado_mae: "Estado da mãe",
  data_nascimento_mae: "Nascimento da mãe",
  celular_mae: "Celular da mãe",
  telefone_mae: "Telefone da mãe",
  email_mae: "E-mail da mãe",

  percentual_desconto: "Percentual de desconto",
  percentual_desconto_ext: "Percentual por extenso",
  valor_com_desconto: "Mensalidade com desconto",
  valor_com_desconto_ext: "Mensalidade por extenso",
};

/* ---------- número por extenso (pt-BR) ---------- */
const UNIDADES = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const DEZENAS = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const CENTENAS = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

const ateMil = (n: number): string => {
  if (n === 0) return "";
  if (n === 100) return "cem";
  if (n < 20) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const r = n % 10;
    return DEZENAS[d] + (r ? ` e ${UNIDADES[r]}` : "");
  }
  const c = Math.floor(n / 100);
  const r = n % 100;
  return CENTENAS[c] + (r ? ` e ${ateMil(r)}` : "");
};

const inteiroExtenso = (n: number): string => {
  if (n === 0) return "zero";
  const milhares = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhares === 1) partes.push("mil");
  else if (milhares > 1) partes.push(`${ateMil(milhares)} mil`);
  if (resto) partes.push(ateMil(resto));
  return partes.join(resto && resto < 100 ? " e " : " ");
};

const reaisExtenso = (valor: number): string => {
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  const base = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}`;
  if (!centavos) return base;
  return `${base} e ${inteiroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
};

const percentualExtenso = (p: number): string =>
  `${inteiroExtenso(p)} por cento`;


/** Só aparece quando a etapa foi realmente concluída */
const Badge = ({ ok, label }: { ok: boolean; label: string }) =>
  ok ? (
    <span className="inline-block rounded bg-zampieri-green-dark px-2 py-0.5 text-xs font-medium text-white">
      {label}
    </span>
  ) : null;

const Situacao = ({
  gerado,
  assinado,
  pago,
}: {
  gerado: boolean;
  assinado: boolean;
  pago: boolean;
}) =>
  gerado || assinado || pago ? (
    <span className="space-x-1">
      <Badge ok={gerado} label="Gerado" />
      <Badge ok={assinado} label="Assinado" />
      <Badge ok={pago} label="Pago" />
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">Não iniciada</span>
  );

const respLabel = (r: string | null) => {
  const v = (r || "").toLowerCase();
  if (v.includes("pai")) return "Pai";
  if (v.includes("mae") || v.includes("mãe")) return "Mãe";
  return r || "—";
};

const GRUPOS: { chave: string; titulo: string; teste: (campo: string) => boolean }[] = [
  { chave: "aluno", titulo: "Aluno", teste: (c) => c === "cpf_aluno" || c.endsWith("_aluno") },
  {
    chave: "curso",
    titulo: "Curso e turno",
    teste: (c) => c === "curso_2027" || c === "turno_escolhido" || c === "responsavel_financeiro",
  },
  { chave: "pai", titulo: "Pai", teste: (c) => c.endsWith("_pai") },
  { chave: "mae", titulo: "Mãe", teste: (c) => c.endsWith("_mae") },
  {
    chave: "valores",
    titulo: "Valores",
    teste: (c) => c.startsWith("percentual_") || c.startsWith("valor_"),
  },
  { chave: "outros", titulo: "Outros", teste: () => true },
];

const grupoDe = (campo: string) => GRUPOS.find((g) => g.teste(campo)) ?? GRUPOS[GRUPOS.length - 1];

/* ---------- equivalência de valores (ignora diferença só de formatação) ---------- */
const soDigitos = (v: string) => v.replace(/\D+/g, "");

const CAMPOS_NUMERICOS = /(cpf|rg|cep|celular|telefone)/;
const CAMPOS_DATA = /^data_nascimento_/;
const CAMPOS_VALOR = /^(percentual_desconto|valor_com_desconto)$/;

const normTexto = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const parseData = (v: string): string | null => {
  const t = v.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = t.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

/** true quando anterior e novo representam o mesmo dado (só mudou a formatação) */
const mesmoValor = (campo: string, anterior: string | null, novo: string | null) => {
  const a = (anterior ?? "").trim();
  const b = (novo ?? "").trim();
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a === b) return true;

  if (CAMPOS_NUMERICOS.test(campo)) return soDigitos(a) === soDigitos(b) && soDigitos(a) !== "";
  if (CAMPOS_DATA.test(campo)) {
    const da = parseData(a);
    const db = parseData(b);
    return !!da && da === db;
  }
  if (CAMPOS_VALOR.test(campo)) {
    const na = Number(a.replace(/[^\d,.-]/g, "").replace(",", "."));
    const nb = Number(b.replace(/[^\d,.-]/g, "").replace(",", "."));
    return Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) < 0.005;
  }
  return normTexto(a) === normTexto(b);
};

/** alterações reais: descarta as que são só diferença de formatação */
const alteracoesReais = (itens: Alteracao[]) =>
  itens.filter((a) => !mesmoValor(a.campo, a.valor_anterior, a.valor_novo));

const ListaAlteracoes = ({ itens: brutos }: { itens: Alteracao[] }) => {
  const [modo, setModo] = useState<"todos" | "corrigidos" | "preenchidos">("todos");

  const itens = alteracoesReais(brutos);

  const ehPreenchido = (a: Alteracao) => !a.valor_anterior || !a.valor_anterior.trim();

  const filtrados = itens.filter((a) =>
    modo === "todos" ? true : modo === "preenchidos" ? ehPreenchido(a) : !ehPreenchido(a),
  );


  const totalCorrigidos = itens.filter((a) => !ehPreenchido(a)).length;
  const totalPreenchidos = itens.length - totalCorrigidos;

  const grupos = GRUPOS.map((g) => ({
    ...g,
    itens: filtrados.filter((a) => grupoDe(a.campo).chave === g.chave),
  })).filter((g) => g.itens.length > 0);

  const opcoes: { id: typeof modo; label: string }[] = [
    { id: "todos", label: `Todos (${itens.length})` },
    { id: "corrigidos", label: `Corrigidos (${totalCorrigidos})` },
    { id: "preenchidos", label: `Preenchidos (${totalPreenchidos})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setModo(o.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              modo === o.id
                ? "border-zampieri-green-dark bg-zampieri-green-dark text-white"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma alteração nesta seleção.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.chave} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.titulo} · {g.itens.length}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.itens.map((a, i) => {
                const preenchido = ehPreenchido(a);
                return (
                  <div
                    key={`${a.campo}-${i}`}
                    className="rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zampieri-green-dark">
                        {LABEL_CAMPO[a.campo] || a.campo}
                      </p>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          preenchido
                            ? "bg-zampieri-green-light/15 text-zampieri-green-dark"
                            : "bg-zampieri-gold/15 text-zampieri-gold"
                        }`}
                      >
                        {preenchido ? "Preenchido" : "Corrigido"}
                      </span>
                    </div>

                    {!preenchido && (
                      <p className="break-words text-xs text-muted-foreground line-through">
                        {a.valor_anterior}
                      </p>
                    )}
                    <p className="break-words text-sm font-medium text-foreground">
                      {a.valor_novo || "vazio"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};


const Rematricula2027Admin = () => {
  const { loading: authLoading , podeAcessar } = useAuth();
  const [linhas, setLinhas] = useState<LinhaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [revisando, setRevisando] = useState<LinhaAdmin | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<LinhaAdmin | null>(null);
  const [form, setForm] = useState({
    cpf_pai: "",
    telefone_pai: "",
    celular_pai: "",
    cpf_mae: "",
    telefone_mae: "",
    celular_mae: "",
  });

  const abrirEdicao = (l: LinhaAdmin) => {
    setForm({
      cpf_pai: maskCpf(l.cpf_pai || ""),
      telefone_pai: maskTelefone(l.telefone_pai || ""),
      celular_pai: maskTelefone(l.celular_pai || ""),
      cpf_mae: maskCpf(l.cpf_mae || ""),
      telefone_mae: maskTelefone(l.telefone_mae || ""),
      celular_mae: maskTelefone(l.celular_mae || ""),
    });
    setEditando(l);
  };

  const salvarContatos = async () => {
    if (!editando) return;
    setSalvando(true);
    const { data, error } = await supabase.rpc("rematricula_2027_admin_editar_contatos", {
      p_id_aluno: editando.id_aluno,
      p_cpf_pai: form.cpf_pai || null,
      p_telefone_pai: form.telefone_pai || null,
      p_celular_pai: form.celular_pai || null,
      p_cpf_mae: form.cpf_mae || null,
      p_telefone_mae: form.telefone_mae || null,
      p_celular_mae: form.celular_mae || null,
    });
    setSalvando(false);
    const res = (data as { success: boolean; message: string }[] | null)?.[0];
    if (error || !res?.success) {
      toast.error(res?.message || "Não foi possível salvar os dados.");
      return;
    }
    toast.success("Dados atualizados.");
    setEditando(null);
    carregar();
  };

  const [editandoValores, setEditandoValores] = useState<LinhaAdmin | null>(null);
  const [salvandoValores, setSalvandoValores] = useState(false);
  const [formValores, setFormValores] = useState({
    percentual: "0",
    percentual_ext: "",
    valor: "",
    valor_ext: "",
  });

  const valoresTravados = editandoValores
    ? editandoValores.contrato_assinado ||
      editandoValores.rematricula_concluida ||
      !!editandoValores.data_pagamento
    : false;

  const opcoesPercentual = useMemo(() => {
    const base = Array.from({ length: 41 }, (_, i) => i + 10);
    const atual = Number(editandoValores?.percentual_desconto ?? 0);
    if (Number.isFinite(atual) && atual > 0 && !base.includes(atual)) {
      return [atual, ...base].sort((a, b) => a - b);
    }
    return base;
  }, [editandoValores]);


  const abrirEdicaoValores = (l: LinhaAdmin) => {
    const p = Number(l.percentual_desconto ?? 0);
    const v = Number(l.valor_com_desconto ?? 0);
    setFormValores({
      percentual: String(p),
      percentual_ext: percentualExtenso(p),
      valor: v ? v.toFixed(2) : "",
      valor_ext: v ? reaisExtenso(v) : "",
    });
    setEditandoValores(l);
  };

  const mudarPercentual = (valorPercentual: string) => {
    const p = Number(valorPercentual);
    const cheio = Number(editandoValores?.valor_cheio ?? 0);
    const sugerido = cheio ? Math.round(cheio * (1 - p / 100) * 100) / 100 : null;
    setFormValores((f) => ({
      ...f,
      percentual: valorPercentual,
      percentual_ext: percentualExtenso(p),
      valor: sugerido !== null ? sugerido.toFixed(2) : f.valor,
      valor_ext: sugerido !== null ? reaisExtenso(sugerido) : f.valor_ext,
    }));
  };

  const mudarValor = (v: string) => {
    const num = Number(v.replace(",", "."));
    setFormValores((f) => ({
      ...f,
      valor: v,
      valor_ext: Number.isFinite(num) && num > 0 ? reaisExtenso(num) : f.valor_ext,
    }));
  };

  const salvarValores = async () => {
    if (!editandoValores) return;
    const valorNum = Number(formValores.valor.replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      toast.error("Informe uma mensalidade válida.");
      return;
    }
    setSalvandoValores(true);
    const { data, error } = await supabase.rpc("rematricula_2027_admin_editar_valores", {
      p_id_aluno: editandoValores.id_aluno,
      p_percentual_desconto: Number(formValores.percentual),
      p_percentual_desconto_ext: formValores.percentual_ext || null,
      p_valor_com_desconto: valorNum,
      p_valor_com_desconto_ext: formValores.valor_ext || null,
    });
    setSalvandoValores(false);
    const res = (data as { success: boolean; message: string }[] | null)?.[0];
    if (error || !res?.success) {
      toast.error(res?.message || "Não foi possível salvar os valores.");
      return;
    }
    toast.success("Valores atualizados.");
    setEditandoValores(null);
    carregar();
  };

  // ---- Cancelamento da rematrícula (estorno + contrato + reset) ----
  const [cancelando, setCancelando] = useState<LinhaAdmin | null>(null);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [confirmaCancel, setConfirmaCancel] = useState("");
  const [executandoCancel, setExecutandoCancel] = useState(false);

  const abrirCancelamento = (l: LinhaAdmin) => {
    setMotivoCancel("");
    setConfirmaCancel("");
    setCancelando(l);
  };

  const executarCancelamento = async () => {
    if (!cancelando) return;
    setExecutandoCancel(true);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-admin-cancelar", {
      body: { id_aluno: cancelando.id_aluno, motivo: motivoCancel.trim() },
    });
    setExecutandoCancel(false);
    const res = data as
      | { ok?: boolean; estornado?: number; contrato_cancelado?: boolean; avisos?: string[]; error?: string }
      | null;
    if (error || !res?.ok) {
      toast.error(res?.error === "forbidden" ? "Sem permissão." : "Não foi possível cancelar agora.");
      return;
    }
    const partes = [
      res.estornado && res.estornado > 0 ? `estorno de ${formatBRL(res.estornado)}` : "sem estorno",
      res.contrato_cancelado ? "contrato cancelado" : null,
    ].filter(Boolean);
    toast.success(`Rematrícula cancelada (${partes.join(", ")}).`);
    (res.avisos ?? []).forEach((a) => toast.warning(a));
    setCancelando(null);
    carregar();
  };






  useEffect(() => {
    document.title = "Rematrícula 2027 — Administração";
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("rematricula_2027_admin_listagem");
    setLinhas(
      ((data as unknown as LinhaAdmin[]) ?? []).map((l) => ({
        ...l,
        alteracoes: (l.alteracoes as unknown as Alteracao[]) ?? [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (podeAcessar("rematricula")) carregar();
  }, [podeAcessar("rematricula")]);

  const conferir = async (id_aluno: number, conferida: boolean) => {
    setSalvando(true);
    const { data, error } = await supabase.rpc("rematricula_2027_admin_conferir", {
      p_id_aluno: id_aluno,
      p_conferida: conferida,
    });
    setSalvando(false);
    const res = (data as { success: boolean; message: string }[] | null)?.[0];
    if (error || !res?.success) {
      toast.error("Não foi possível atualizar a conferência.");
      return;
    }
    toast.success(conferida ? "Rematrícula marcada como conferida." : "Conferência desfeita.");
    setRevisando(null);
    setLinhas((prev) =>
      prev.map((l) =>
        l.id_aluno === id_aluno
          ? { ...l, conferida, conferida_em: conferida ? new Date().toISOString() : null }
          : l,
      ),
    );
  };

  const cpfSuspeito = (l: LinhaAdmin) =>
    (!!l.cpf_pai && !isValidCpf(l.cpf_pai)) || (!!l.cpf_mae && !isValidCpf(l.cpf_mae));

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro === "cpf_invalido" && !cpfSuspeito(l)) return false;
      if (filtro === "concluidas" && !l.rematricula_concluida) return false;
      if (filtro === "a_conferir" && (!l.rematricula_concluida || l.conferida)) return false;
      if (filtro === "conferidas" && !l.conferida) return false;
      if (filtro === "assinados" && !l.contrato_assinado) return false;
      if (filtro === "pendentes" && l.rematricula_concluida) return false;
      if (!termo) return true;
      return (
        l.nome_aluno.toLowerCase().includes(termo) ||
        String(l.id_aluno).includes(termo) ||
        l.numeros.some((n) => n.includes(termo))
      );
    });
  }, [linhas, busca, filtro]);

  const totais = useMemo(
    () => ({
      alunos: linhas.length,
      concluidas: linhas.filter((l) => l.rematricula_concluida).length,
      aConferir: linhas.filter((l) => l.rematricula_concluida && !l.conferida).length,
      conferidas: linhas.filter((l) => l.conferida).length,
      cpfInvalido: linhas.filter(
        (l) => (!!l.cpf_pai && !isValidCpf(l.cpf_pai)) || (!!l.cpf_mae && !isValidCpf(l.cpf_mae)),
      ).length,
    }),
    [linhas],
  );

  if (authLoading || !podeAcessar("rematricula")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
              Rematrícula 2027
            </h1>
            <p className="text-sm text-muted-foreground">
              Controle de alunos rematriculados, conferência e números da sorte.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/rematricula2027/followup">Follow-up de pendentes</a>
            </Button>
            <Button variant="outline" onClick={carregar} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Alunos", valor: totais.alunos },
            { label: "Rematrículas concluídas", valor: totais.concluidas },
            { label: "Aguardando conferência", valor: totais.aConferir },
            { label: "Conferidas", valor: totais.conferidas },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-white p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold text-zampieri-green-dark">{c.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, ID do aluno ou número da sorte"
              className="pl-9 bg-white"
            />
          </div>
          {(
            [
              ["todos", "Todos"],
              ["concluidas", "Concluídas"],
              ["a_conferir", "A conferir"],
              ["conferidas", "Conferidas"],
              ["assinados", "Contrato assinado"],
              ["pendentes", "Pendentes"],
              ["cpf_invalido", `CPF inválido (${totais.cpfInvalido})`],
            ] as [Filtro, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltro(v)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                filtro === v
                  ? "border-zampieri-green-dark bg-zampieri-cream text-zampieri-green-dark"
                  : "border-border bg-white text-muted-foreground hover:border-zampieri-green-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3">Curso 2027</th>
                <th className="p-3">Resp. financeiro</th>
                <th className="p-3">Desconto</th>
                <th className="p-3">Situação</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Alterações</th>
                <th className="p-3">Conferência</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              )}
              {!loading && filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
              {filtradas.map((l) => {
                const resp = respLabel(l.responsavel_financeiro);
                const respNome = resp === "Pai" ? l.nome_pai : resp === "Mãe" ? l.nome_mae : null;
                const respCpf = resp === "Pai" ? l.cpf_pai : resp === "Mãe" ? l.cpf_mae : null;
                return (
                  <Fragment key={l.id_aluno}>
                    <tr className="border-t border-border align-top">
                      <td className="p-3">
                        <p className="font-medium text-zampieri-green-dark">{l.nome_aluno}</p>
                        <p className="text-xs text-muted-foreground">
                          ID {l.id_aluno} · {l.curso_atual}
                        </p>
                        <button
                          type="button"
                          onClick={() => abrirEdicao(l)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-zampieri-green-dark underline"
                        >
                          <Pencil className="w-3 h-3" /> Editar contatos
                        </button>
                        <br />
                        <button
                          type="button"
                          onClick={() => abrirEdicaoValores(l)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-zampieri-green-dark underline"
                        >
                          <Pencil className="w-3 h-3" /> Editar valores
                        </button>
                        <br />
                        <button
                          type="button"
                          onClick={() => abrirCancelamento(l)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-destructive underline"
                        >
                          <Ban className="w-3 h-3" /> Cancelar rematrícula
                        </button>
                        {l.cancelada && (
                          <p className="mt-1 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                            Cancelada
                            {l.cancelada_em
                              ? ` em ${new Date(l.cancelada_em).toLocaleDateString("pt-BR")}`
                              : ""}
                            {l.motivo_cancelamento ? ` · ${l.motivo_cancelamento}` : ""}
                            {l.estorno_valor ? ` · estorno ${formatBRL(l.estorno_valor)}` : ""}
                          </p>
                        )}
                      </td>



                      <td className="p-3">
                        {l.curso_2027}
                        <p className="text-xs text-muted-foreground">{l.turno_escolhido || "—"}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-zampieri-green-dark">{resp}</span>
                        {respNome && (
                          <p className="text-xs text-muted-foreground">
                            {respNome}
                            {respCpf ? ` · ${maskCpf(respCpf)}` : ""}
                          </p>
                        )}
                        {cpfSuspeito(l) && (
                          <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            CPF cadastrado inválido
                          </p>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="rounded bg-zampieri-cream px-2 py-0.5 text-xs font-bold text-zampieri-green-dark">
                          {Number(l.percentual_desconto ?? 0)}%
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {formatBRL(l.valor_com_desconto)}/mês
                        </p>
                      </td>
                      <td className="p-3 space-x-1 whitespace-nowrap">
                        <Situacao
                          gerado={l.contrato_gerado}
                          assinado={l.contrato_assinado}
                          pago={l.rematricula_concluida}
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {l.rematricula_concluida ? (
                          <>
                            <p className="font-medium">
                              {l.valor_pago == null
                                ? "Valor não informado"
                                : formatBRL(l.valor_pago)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {l.forma_pagamento === "pix" ? "PIX" : "Cartão"}
                              {l.parcelas && l.parcelas > 1 ? ` ${l.parcelas}x` : ""}
                              {l.data_pagamento
                                ? ` · ${new Date(l.data_pagamento).toLocaleDateString("pt-BR")}`
                                : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {alteracoesReais(l.alteracoes).length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sem alterações</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandido(expandido === l.id_aluno ? null : l.id_aluno)
                            }
                            className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                          >
                            Dados alterados ({alteracoesReais(l.alteracoes).length})
                            {expandido === l.id_aluno ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {!l.rematricula_concluida ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : l.conferida ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded bg-zampieri-green-dark px-2 py-0.5 text-xs font-medium text-white">
                              <Check className="w-3 h-3" /> Conferida
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {l.conferida_em
                                ? new Date(l.conferida_em).toLocaleDateString("pt-BR")
                                : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() => conferir(l.id_aluno, false)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                            >
                              <Undo2 className="w-3 h-3" /> Desfazer
                            </button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setRevisando(l)}>
                            Conferir
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandido === l.id_aluno && l.alteracoes.length > 0 && (
                      <tr className="bg-amber-50/60">
                        <td colSpan={8} className="p-3">
                          <ListaAlteracoes itens={l.alteracoes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!revisando} onOpenChange={(o) => !o && setRevisando(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferir rematrícula</DialogTitle>
            <DialogDescription>
              Revise os dados antes de marcar como conferida no sistema interno.
            </DialogDescription>
          </DialogHeader>
          {revisando && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-zampieri-green-dark">{revisando.nome_aluno}</p>
                <p className="text-xs text-muted-foreground">
                  ID {revisando.id_aluno} · {revisando.curso_2027} ·{" "}
                  {revisando.turno_escolhido || "sem turno"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Responsável financeiro</p>
                  <p className="font-medium">{respLabel(revisando.responsavel_financeiro)}</p>
                  <p className="text-xs text-muted-foreground">
                    {respLabel(revisando.responsavel_financeiro) === "Pai"
                      ? `${revisando.nome_pai || "—"} · ${revisando.cpf_pai || "—"} · ${revisando.celular_pai || "—"}`
                      : `${revisando.nome_mae || "—"} · ${revisando.cpf_mae || "—"} · ${revisando.celular_mae || "—"}`}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Desconto da mensalidade</p>
                  <p className="font-medium">{Number(revisando.percentual_desconto ?? 0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(revisando.valor_cheio)} → {formatBRL(revisando.valor_com_desconto)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <p className="font-medium">
                  {revisando.valor_pago == null
                    ? "Valor não informado"
                    : formatBRL(revisando.valor_pago)}{" "}
                  ·{" "}
                  {revisando.forma_pagamento === "pix" ? "PIX" : "Cartão"}
                  {revisando.parcelas && revisando.parcelas > 1 ? ` ${revisando.parcelas}x` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {revisando.data_pagamento
                    ? new Date(revisando.data_pagamento).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Alterações de dados ({alteracoesReais(revisando.alteracoes).length})
                </p>
                {alteracoesReais(revisando.alteracoes).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma alteração registrada pela família.
                  </p>
                ) : (
                  <ListaAlteracoes itens={revisando.alteracoes} />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisando(null)}>
              Cancelar
            </Button>
            <Button
              disabled={salvando}
              onClick={() => revisando && conferir(revisando.id_aluno, true)}
            >
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar conferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar contatos dos responsáveis</DialogTitle>
            <DialogDescription>
              {editando ? `${editando.nome_aluno} · ID ${editando.id_aluno}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="font-medium text-zampieri-green-dark">
                Pai {editando?.nome_pai ? `· ${editando.nome_pai}` : ""}
              </p>
              <div>
                <label className="text-xs text-muted-foreground">CPF do pai</label>
                <Input
                  value={form.cpf_pai}
                  onChange={(e) => setForm({ ...form, cpf_pai: maskCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Telefone do pai</label>
                  <Input
                    value={form.telefone_pai}
                    onChange={(e) =>
                      setForm({ ...form, telefone_pai: maskTelefone(e.target.value) })
                    }
                    placeholder="(11) 0000-0000"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Celular do pai</label>
                  <Input
                    value={form.celular_pai}
                    onChange={(e) =>
                      setForm({ ...form, celular_pai: maskTelefone(e.target.value) })
                    }
                    placeholder="(11) 90000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="font-medium text-zampieri-green-dark">
                Mãe {editando?.nome_mae ? `· ${editando.nome_mae}` : ""}
              </p>
              <div>
                <label className="text-xs text-muted-foreground">CPF da mãe</label>
                <Input
                  value={form.cpf_mae}
                  onChange={(e) => setForm({ ...form, cpf_mae: maskCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Telefone da mãe</label>
                  <Input
                    value={form.telefone_mae}
                    onChange={(e) =>
                      setForm({ ...form, telefone_mae: maskTelefone(e.target.value) })
                    }
                    placeholder="(11) 0000-0000"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Celular da mãe</label>
                  <Input
                    value={form.celular_mae}
                    onChange={(e) =>
                      setForm({ ...form, celular_mae: maskTelefone(e.target.value) })
                    }
                    placeholder="(11) 90000-0000"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Campos deixados em branco mantêm o valor atual. As mudanças ficam registradas no
              histórico de alterações.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando} onClick={salvarContatos}>
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editandoValores} onOpenChange={(o) => !o && setEditandoValores(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar valores da rematrícula</DialogTitle>
            <DialogDescription>
              {editandoValores?.nome_aluno} · {editandoValores?.curso_2027 || "—"}
            </DialogDescription>
          </DialogHeader>

          {editandoValores && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zampieri-cream/60 p-3 text-sm">
                <p>
                  Valor cheio: <strong>{formatBRL(editandoValores.valor_cheio)}</strong>
                </p>
                <p>
                  Atual: <strong>{Number(editandoValores.percentual_desconto ?? 0)}%</strong> ·{" "}
                  <strong>{formatBRL(editandoValores.valor_com_desconto)}</strong>/mês
                </p>
              </div>

              {valoresTravados && (
                <p className="rounded-lg bg-amber-100 p-3 text-xs font-medium text-amber-900">
                  Contrato assinado ou rematrícula paga: os valores não podem mais ser alterados por
                  aqui. Trate o caso diretamente com a secretaria.
                </p>
              )}
              {!valoresTravados && editandoValores.contrato_gerado && (
                <p className="rounded-lg bg-amber-100 p-3 text-xs font-medium text-amber-900">
                  O contrato já foi gerado. Ao salvar, ele será invalidado e precisará ser gerado
                  novamente com os novos valores.
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Percentual de desconto
                </label>
                <select
                  disabled={valoresTravados}
                  value={formValores.percentual}
                  onChange={(e) => mudarPercentual(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                >
                  {opcoesPercentual.map((p) => (
                    <option key={p} value={p}>
                      {p}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Percentual por extenso (contrato)
                </label>
                <Input
                  disabled={valoresTravados}
                  value={formValores.percentual_ext}
                  onChange={(e) =>
                    setFormValores((f) => ({ ...f, percentual_ext: e.target.value }))
                  }
                  placeholder="trinta por cento"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Mensalidade com desconto (R$)
                </label>
                <Input
                  disabled={valoresTravados}
                  inputMode="decimal"
                  value={formValores.valor}
                  onChange={(e) => mudarValor(e.target.value)}
                  placeholder="Ex: 850.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Mensalidade por extenso (contrato)
                </label>
                <Input
                  disabled={valoresTravados}
                  value={formValores.valor_ext}
                  onChange={(e) => setFormValores((f) => ({ ...f, valor_ext: e.target.value }))}
                  placeholder="oitocentos e cinquenta reais"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Os textos por extenso são sugeridos automaticamente e podem ser ajustados. As
                mudanças ficam registradas no histórico de alterações.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoValores(null)}>
              Cancelar
            </Button>
            <Button disabled={salvandoValores || valoresTravados} onClick={salvarValores}>
              {salvandoValores && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar valores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar rematrícula</DialogTitle>
            <DialogDescription>
              {cancelando?.nome_aluno} · ID {cancelando?.id_aluno}
            </DialogDescription>
          </DialogHeader>

          {cancelando && (
            <div className="space-y-4">
              <ul className="space-y-1 rounded-md bg-destructive/5 p-3 text-sm text-foreground">
                <li>
                  •{" "}
                  {cancelando.valor_pago
                    ? `Estorno do valor pago (${formatBRL(cancelando.valor_pago)}) no Asaas`
                    : "Nenhum pagamento confirmado — nada será estornado"}
                </li>
                <li>
                  •{" "}
                  {cancelando.contrato_gerado || cancelando.contrato_assinado
                    ? "Cancelamento do contrato na ZapSign"
                    : "Nenhum contrato gerado"}
                </li>
                <li>• A família volta ao início e pode refazer a rematrícula</li>
              </ul>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Motivo do cancelamento
                </label>
                <Input
                  value={motivoCancel}
                  onChange={(e) => setMotivoCancel(e.target.value)}
                  placeholder="Ex: solicitação da família"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Digite CANCELAR para confirmar
                </label>
                <Input
                  value={confirmaCancel}
                  onChange={(e) => setConfirmaCancel(e.target.value.toUpperCase())}
                  placeholder="CANCELAR"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={
                executandoCancel || motivoCancel.trim().length < 3 || confirmaCancel !== "CANCELAR"
              }
              onClick={executarCancelamento}
            >
              {executandoCancel && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>



  );
};

export default Rematricula2027Admin;
