import { useState } from "react";
import { Search, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf, maskTelefone, onlyDigits } from "./utils";
import { AlunoResumo } from "./types";

interface Props {
  onSelecionar: (aluno: AlunoResumo) => void;
}

type Tipo = "telefone" | "cpf";

export const StepBusca = ({ onSelecionar }: Props) => {
  const [tipo, setTipo] = useState<Tipo>("telefone");
  const [termo, setTermo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<AlunoResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const trocarTipo = (t: Tipo) => {
    setTipo(t);
    setTermo("");
    setErro(null);
    setResultados(null);
  };

  const aoDigitar = (v: string) => {
    setTermo(tipo === "cpf" ? maskCpf(v) : maskTelefone(v));
  };

  const buscar = async () => {
    const digitos = onlyDigits(termo);
    if (tipo === "cpf" && digitos.length !== 11) {
      setErro("Digite o CPF completo (11 dígitos).");
      return;
    }
    if (tipo === "telefone" && digitos.length < 10) {
      setErro("Digite o telefone com DDD (10 ou 11 dígitos).");
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
          Busque pelo telefone cadastrado na escola (com DDD) ou pelo CPF do responsável.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["telefone", "cpf"] as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => trocarTipo(t)}
            className={`rounded-lg border p-2.5 text-sm font-semibold transition-colors ${
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
        <Label htmlFor="termo">{tipo === "cpf" ? "CPF do responsável" : "Telefone com DDD"}</Label>
        <div className="flex gap-2">
          <Input
            id="termo"
            inputMode="numeric"
            maxLength={tipo === "cpf" ? 14 : 15}
            placeholder={tipo === "cpf" ? "000.000.000-00" : "(00) 00000-0000"}
            value={termo}
            onChange={(e) => aoDigitar(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <Button onClick={buscar} disabled={loading} className="bg-zampieri-green-dark hover:bg-zampieri-green">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {tipo === "cpf"
            ? "Use o CPF do pai ou da mãe cadastrado na escola."
            : "Informe o DDD seguido do número, sem espaços extras."}
        </p>
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
