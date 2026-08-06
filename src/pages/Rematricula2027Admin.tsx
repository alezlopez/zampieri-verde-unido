import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, RefreshCw, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL, maskCpf, maskTelefone } from "@/components/rematricula/utils";

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

  qtd_alteracoes: number;
  alteracoes: Alteracao[];
}

type Filtro = "todos" | "concluidas" | "a_conferir" | "conferidas" | "assinados" | "pendentes";

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
  email_mae: "E-mail da mãe",
};

const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
      ok ? "bg-zampieri-cream text-zampieri-green-dark" : "bg-muted text-muted-foreground"
    }`}
  >
    {label}
  </span>
);

const respLabel = (r: string | null) => {
  const v = (r || "").toLowerCase();
  if (v.includes("pai")) return "Pai";
  if (v.includes("mae") || v.includes("mãe")) return "Mãe";
  return r || "—";
};

const ListaAlteracoes = ({ itens }: { itens: Alteracao[] }) => (
  <div className="space-y-1">
    {itens.map((a, i) => (
      <div key={`${a.campo}-${i}`} className="text-xs">
        <span className="font-medium text-zampieri-green-dark">
          {LABEL_CAMPO[a.campo] || a.campo}:
        </span>{" "}
        <span className="text-muted-foreground line-through">{a.valor_anterior || "vazio"}</span>{" "}
        <span aria-hidden>→</span>{" "}
        <span className="font-medium">{a.valor_novo || "vazio"}</span>{" "}
        <span className="text-muted-foreground">
          ({new Date(a.created_at).toLocaleDateString("pt-BR")})
        </span>
      </div>
    ))}
  </div>
);

const Rematricula2027Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [linhas, setLinhas] = useState<LinhaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [revisando, setRevisando] = useState<LinhaAdmin | null>(null);
  const [salvando, setSalvando] = useState(false);

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
    if (isAdmin) carregar();
  }, [isAdmin]);

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

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((l) => {
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
    }),
    [linhas],
  );

  if (authLoading || !isAdmin) {
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
                            {respCpf ? ` · ${respCpf}` : ""}
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
                        <Badge ok={l.contrato_gerado} label="Gerado" />
                        <Badge ok={l.contrato_assinado} label="Assinado" />
                        <Badge ok={l.rematricula_concluida} label="Pago" />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {l.rematricula_concluida ? (
                          <>
                            <p className="font-medium">{formatBRL(l.valor_pago)}</p>
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
                        {l.qtd_alteracoes === 0 ? (
                          <span className="text-xs text-muted-foreground">Sem alterações</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandido(expandido === l.id_aluno ? null : l.id_aluno)
                            }
                            className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                          >
                            Dados alterados ({l.qtd_alteracoes})
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
                  {formatBRL(revisando.valor_pago)} ·{" "}
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
                  Alterações de dados ({revisando.qtd_alteracoes})
                </p>
                {revisando.alteracoes.length === 0 ? (
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
    </main>
  );
};

export default Rematricula2027Admin;
