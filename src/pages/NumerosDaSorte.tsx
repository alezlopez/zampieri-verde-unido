import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf, maskTelefone, maskDataBr, brToIso, onlyDigits } from "@/components/rematricula/utils";

type Tipo = "telefone" | "cpf";

interface Linha {
  id_aluno: number;
  nome_aluno: string;
  curso_2027: string | null;
  numero: string;
  faixa: string;
}

const NumerosDaSorte = () => {
  const [tipo, setTipo] = useState<Tipo>("telefone");
  const [termo, setTermo] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Linha[] | null>(null);

  useEffect(() => {
    document.title = "Números da sorte | Rematrícula 2027";
  }, []);

  const trocarTipo = (t: Tipo) => {
    setTipo(t);
    setTermo("");
    setErro(null);
    setResultado(null);
  };

  const consultar = async () => {
    const digitos = onlyDigits(termo);
    if (tipo === "cpf" && digitos.length !== 11) {
      setErro("Digite o CPF completo (11 dígitos).");
      return;
    }
    if (tipo === "telefone" && digitos.length < 10) {
      setErro("Digite o telefone com DDD (10 ou 11 dígitos).");
      return;
    }
    const iso = brToIso(nascimento);
    if (!iso) {
      setErro("Informe a data de nascimento do aluno (dd/mm/aaaa).");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultado(null);
    const { data, error } = await supabase.rpc("rematricula_2027_numeros_consultar", {
      p_termo: digitos,
      p_data_nascimento: iso,
    });
    setLoading(false);
    if (error) {
      const msg = String(error.message || "");
      setErro(
        msg.includes("muitas_tentativas")
          ? "Muitas consultas seguidas. Aguarde alguns minutos e tente novamente."
          : "Não foi possível consultar agora. Tente novamente em instantes.",
      );
      return;
    }
    setResultado((data as Linha[]) ?? []);
  };

  const alunos = Array.from(
    new Map((resultado ?? []).map((r) => [r.id_aluno, r])).values(),
  );

  return (
    <main className="min-h-screen bg-zampieri-cream/40 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <Sparkles className="w-8 h-8 text-zampieri-gold mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
            Números da sorte — Rematrícula 2027
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte os números da sorte gerados após a confirmação do pagamento da rematrícula.
          </p>
          <Link
            to="/numerosdasorte/transparencia"
            className="inline-block text-sm font-medium text-zampieri-green-dark underline"
          >
            Ver portal de transparência
          </Link>
        </header>

        <section className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["telefone", "cpf"] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => trocarTipo(t)}
                className={`rounded-lg border p-2 text-sm font-medium transition-colors ${
                  tipo === t
                    ? "border-zampieri-green-dark bg-zampieri-cream text-zampieri-green-dark"
                    : "border-border text-muted-foreground hover:border-zampieri-green-dark"
                }`}
              >
                {t === "telefone" ? "Telefone" : "CPF"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="termo">{tipo === "cpf" ? "CPF do responsável ou do aluno" : "Telefone com DDD"}</Label>
            <Input
              id="termo"
              inputMode="numeric"
              value={termo}
              onChange={(e) => setTermo(tipo === "cpf" ? maskCpf(e.target.value) : maskTelefone(e.target.value))}
              placeholder={tipo === "cpf" ? "000.000.000-00" : "(00) 00000-0000"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nasc">Data de nascimento do aluno</Label>
            <Input
              id="nasc"
              inputMode="numeric"
              value={nascimento}
              onChange={(e) => setNascimento(maskDataBr(e.target.value))}
              placeholder="dd/mm/aaaa"
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <Button
            onClick={consultar}
            disabled={loading}
            className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Consultar números
          </Button>
        </section>

        {resultado && resultado.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum número encontrado. Os números são gerados após a confirmação do pagamento da
            rematrícula.
          </p>
        )}

        {alunos.map((aluno) => {
          const numeros = (resultado ?? []).filter((r) => r.id_aluno === aluno.id_aluno);
          return (
            <section
              key={aluno.id_aluno}
              className="bg-white rounded-xl border border-zampieri-gold p-5 space-y-3"
            >
              <div>
                <h2 className="font-serif text-lg font-bold text-zampieri-green-dark">
                  {aluno.nome_aluno}
                </h2>
                <p className="text-xs text-muted-foreground">{aluno.curso_2027}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {numeros.map((n) => (
                  <span
                    key={n.numero}
                    className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream px-4 py-2 font-mono text-lg font-bold tracking-widest text-zampieri-green-dark"
                  >
                    {n.numero}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {numeros.length} número(s) — promoção {numeros[0]?.faixa}
              </p>
            </section>
          );
        })}
      </div>
    </main>
  );
};

export default NumerosDaSorte;
