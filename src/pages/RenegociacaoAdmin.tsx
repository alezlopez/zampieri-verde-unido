import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { brl, dataBr, type Debito } from "@/components/renegociacao/StepDebitos";

interface LinhaAluno {
  id_aluno: number;
  nome_aluno: string;
  curso_atual: string | null;
  rematricula_liberada: boolean | null;
  total_debitos: number;
  em_aberto: number;
  valor_aberto: number;
  situacao: string | null;
}

const RenegociacaoAdmin = () => {
  const { toast } = useToast();
  const [linhas, setLinhas] = useState<LinhaAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [debitos, setDebitos] = useState<Debito[]>([]);
  const [carregandoDebitos, setCarregandoDebitos] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("renegociacao_2027_admin_listagem");
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setLinhas((data as unknown as LinhaAluno[]) ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirAluno = async (idAluno: number) => {
    if (aberto === idAluno) {
      setAberto(null);
      return;
    }
    setAberto(idAluno);
    setSelecionados([]);
    setCarregandoDebitos(true);
    const { data, error } = await supabase.rpc("renegociacao_2027_admin_debitos", {
      p_id_aluno: idAluno,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setDebitos([]);
    } else {
      setDebitos(((data as unknown as Debito[]) ?? []).map((d) => ({ ...d, row_id: Number(d.row_id) })));
    }
    setCarregandoDebitos(false);
  };

  const darBaixa = async () => {
    if (!aberto || selecionados.length === 0) return;
    setSalvando(true);
    let falhou: string | null = null;
    for (const rowId of selecionados) {
      const { error } = await supabase.rpc("renegociacao_2027_admin_baixa", {
        p_row_id: rowId,
        p_pago: true,
      });
      if (error) {
        falhou = error.message;
        break;
      }
    }
    setSalvando(false);
    if (falhou) {
      toast({ title: "Erro na baixa", description: falhou, variant: "destructive" });
      return;
    }
    toast({ title: "Baixa registrada", description: `${selecionados.length} débito(s) quitado(s).` });
    setSelecionados([]);
    await abrirAluno(aberto);
    setAberto(aberto);
    await carregar();
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter(
      (l) => l.nome_aluno?.toLowerCase().includes(q) || String(l.id_aluno).includes(q),
    );
  }, [linhas, busca]);

  const totalGeral = filtradas.reduce((a, l) => a + Number(l.valor_aberto || 0), 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-1" /> Painel
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-lg font-bold text-zampieri-green-dark">
              Renegociação 2027
            </h1>
            <p className="text-xs text-muted-foreground">
              Débitos em aberto e baixas manuais
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código"
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filtradas.length} aluno(s) · em aberto <strong>{brl(totalGeral)}</strong>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((l) => (
              <div key={l.id_aluno} className="bg-white rounded-lg border">
                <button
                  type="button"
                  onClick={() => abrirAluno(l.id_aluno)}
                  className="w-full text-left p-4 flex flex-wrap items-center gap-x-4 gap-y-1 justify-between"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-zampieri-green-dark truncate">
                      {l.nome_aluno}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      #{l.id_aluno} · {l.curso_atual || "sem curso"} ·{" "}
                      {l.em_aberto}/{l.total_debitos} em aberto
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        l.rematricula_liberada
                          ? "bg-zampieri-cream text-zampieri-green-dark"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {l.rematricula_liberada ? "Liberada" : "Bloqueada"}
                    </span>
                    <span className="font-bold text-foreground">{brl(l.valor_aberto)}</span>
                  </span>
                </button>

                {aberto === l.id_aluno && (
                  <div className="border-t p-4 space-y-3">
                    {carregandoDebitos ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando débitos...
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          {debitos.map((d) => (
                            <label
                              key={d.row_id}
                              className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0"
                            >
                              <Checkbox
                                checked={selecionados.includes(d.row_id)}
                                disabled={d.pago}
                                onCheckedChange={() =>
                                  setSelecionados((s) =>
                                    s.includes(d.row_id)
                                      ? s.filter((r) => r !== d.row_id)
                                      : [...s, d.row_id],
                                  )
                                }
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate">
                                  {d.evento || "Mensalidade"} · venc. {dataBr(d.vencimento)}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  à vista {brl(d.valor_a_vista)} · parcelado {brl(d.valor_parcelado)}
                                </span>
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  d.pago ? "text-zampieri-green-dark" : "text-destructive"
                                }`}
                              >
                                {d.pago ? "Pago" : "Em aberto"}
                              </span>
                            </label>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          disabled={selecionados.length === 0 || salvando}
                          onClick={darBaixa}
                          className="bg-zampieri-green-dark hover:bg-zampieri-green"
                        >
                          {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Dar baixa manual ({selecionados.length})
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RenegociacaoAdmin;
