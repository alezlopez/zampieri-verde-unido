import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Linha {
  numero: string;
  nome_mascarado: string | null;
}

const NumerosDaSorteTransparencia = () => {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    document.title = "Transparência — Números da sorte | Rematrícula 2027";
    (async () => {
      const { data, error } = await supabase.rpc("rematricula_2027_numeros_publicos");
      setLoading(false);
      if (error) {
        setErro("Não foi possível carregar a lista agora. Tente novamente em instantes.");
        return;
      }
      setLinhas((data as Linha[]) ?? []);
    })();
  }, []);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return linhas;
    return linhas.filter(
      (l) => l.numero.includes(t) || (l.nome_mascarado ?? "").toLowerCase().includes(t),
    );
  }, [linhas, busca]);

  const totalAlunos = useMemo(
    () => new Set(linhas.map((l) => l.nome_mascarado ?? "")).size,
    [linhas],
  );

  return (
    <main className="min-h-screen bg-zampieri-cream/40 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <Sparkles className="w-8 h-8 text-zampieri-gold mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
            Portal de transparência — Números da sorte
          </h1>
          <p className="text-sm text-muted-foreground">
            Lista pública de todos os números da sorte emitidos na Rematrícula 2027. A lista é
            atualizada automaticamente conforme os pagamentos são confirmados.
          </p>
          <Link
            to="/numerosdasorte"
            className="inline-block text-sm font-medium text-zampieri-green-dark underline"
          >
            Consultar meus números
          </Link>
        </header>

        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-zampieri-cream p-3">
              <p className="text-2xl font-bold text-zampieri-green-dark">{linhas.length}</p>
              <p className="text-xs text-muted-foreground">números emitidos</p>
            </div>
            <div className="rounded-lg bg-zampieri-cream p-3">
              <p className="text-2xl font-bold text-zampieri-green-dark">{totalAlunos}</p>
              <p className="text-xs text-muted-foreground">alunos participantes</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número ou nome"
              className="pl-9"
            />
          </div>

          {loading && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando lista...
            </p>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          {!loading && !erro && filtradas.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              {linhas.length === 0
                ? "Nenhum número emitido até o momento."
                : "Nenhum resultado para essa busca."}
            </p>
          )}

          {!loading && filtradas.length > 0 && (
            <ul className="divide-y divide-border">
              {filtradas.map((l) => (
                <li key={l.numero} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-lg font-bold tracking-widest text-zampieri-green-dark">
                    {l.numero}
                  </span>
                  <span className="text-sm text-muted-foreground text-right">
                    {l.nome_mascarado}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default NumerosDaSorteTransparencia;
