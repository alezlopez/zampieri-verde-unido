import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/components/rematricula/utils";

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
}

type Filtro = "todos" | "concluidas" | "assinados" | "pendentes";

const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
      ok ? "bg-zampieri-cream text-zampieri-green-dark" : "bg-muted text-muted-foreground"
    }`}
  >
    {label}
  </span>
);

const Rematricula2027Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<LinhaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    document.title = "Rematrícula 2027 — Administração";
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("rematricula_2027_admin_listagem");
    setLinhas((data as LinhaAdmin[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) carregar();
  }, [isAdmin]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro === "concluidas" && !l.rematricula_concluida) return false;
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
      assinados: linhas.filter((l) => l.contrato_assinado).length,
      numeros: linhas.reduce((s, l) => s + l.numeros.length, 0),
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
              Controle de alunos rematriculados e números da sorte.
            </p>
          </div>
          <Button variant="outline" onClick={carregar} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Alunos", valor: totais.alunos },
            { label: "Rematrículas concluídas", valor: totais.concluidas },
            { label: "Contratos assinados", valor: totais.assinados },
            { label: "Números emitidos", valor: totais.numeros },
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
                <th className="p-3">Turno</th>
                <th className="p-3">Resp. financeiro</th>
                <th className="p-3">Situação</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Números da sorte</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              )}
              {!loading && filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
              {filtradas.map((l) => (
                <tr key={l.id_aluno} className="border-t border-border align-top">
                  <td className="p-3">
                    <p className="font-medium text-zampieri-green-dark">{l.nome_aluno}</p>
                    <p className="text-xs text-muted-foreground">
                      ID {l.id_aluno} · {l.curso_atual}
                    </p>
                  </td>
                  <td className="p-3">{l.curso_2027}</td>
                  <td className="p-3">{l.turno_escolhido || "—"}</td>
                  <td className="p-3 capitalize">{l.responsavel_financeiro || "—"}</td>
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
                    {l.numeros.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {l.numeros.map((n) => (
                          <span
                            key={n}
                            className="rounded border border-zampieri-green-dark bg-zampieri-cream px-2 py-0.5 font-mono text-xs font-bold text-zampieri-green-dark"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Rematricula2027Admin;
