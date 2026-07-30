import { useState } from "react";
import { Search, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "./utils";
import { AlunoResumo } from "./types";

interface Props {
  onSelecionar: (aluno: AlunoResumo) => void;
}

export const StepBusca = ({ onSelecionar }: Props) => {
  const [termo, setTermo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<AlunoResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = async () => {
    const digitos = onlyDigits(termo);
    if (digitos.length < 10) {
      setErro("Informe um telefone com DDD (11 dígitos) ou um CPF completo.");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultados(null);
    const { data, error } = await supabase.rpc("rematricula_2027_buscar", { p_termo: digitos });
    setLoading(false);
    if (error) {
      setErro("Não foi possível consultar agora. Tente novamente em instantes.");
      return;
    }
    setResultados((data as AlunoResumo[]) ?? []);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Vamos localizar seu aluno</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Digite o telefone cadastrado na escola (com DDD) ou o CPF do responsável.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="termo">Telefone ou CPF</Label>
        <div className="flex gap-2">
          <Input
            id="termo"
            inputMode="numeric"
            placeholder="11996525783 ou 371.193.558-30"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <Button onClick={buscar} disabled={loading} className="bg-zampieri-green-dark hover:bg-zampieri-green">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>

      {resultados && resultados.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Não encontramos nenhum aluno com esses dados.</p>
          <p className="text-muted-foreground mt-1">
            Confira o número digitado ou fale com a secretaria pelo{" "}
            <a
              href="https://wa.me/5511939341503"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zampieri-green-dark underline"
            >
              WhatsApp
            </a>
            .
          </p>
        </div>
      )}

      {resultados && resultados.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {resultados.length === 1 ? "Aluno encontrado:" : "Selecione o aluno para iniciar:"}
          </p>
          {resultados.map((a) => (
            <button
              key={a.id_aluno}
              onClick={() => onSelecionar(a)}
              className="w-full text-left rounded-lg border border-border hover:border-zampieri-green-dark hover:bg-zampieri-cream/50 transition-colors p-4 flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-zampieri-green-dark" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-zampieri-green-dark truncate">{a.nome_aluno}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {a.curso_atual || "Curso não informado"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
