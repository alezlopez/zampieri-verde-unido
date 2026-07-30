import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { brToIso, maskDataBr } from "./utils";
import { AlunoCompleto, AlunoResumo } from "./types";

interface Props {
  aluno: AlunoResumo;
  onVoltar: () => void;
  onLiberado: (dados: AlunoCompleto, dataIso: string) => void;
}

export const StepIdentidade = ({ aluno, onVoltar, onLiberado }: Props) => {
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    const iso = brToIso(data);
    if (!iso) {
      setErro("Informe a data no formato dd/mm/aaaa.");
      return;
    }
    setErro(null);
    setLoading(true);
    const { data: res, error } = await supabase.rpc("rematricula_2027_abrir", {
      p_id_aluno: aluno.id_aluno,
      p_data_nascimento: iso,
    });
    setLoading(false);
    if (error) {
      setErro("Não foi possível validar agora. Tente novamente.");
      return;
    }
    const row = (res as AlunoCompleto[])?.[0];
    if (!row) {
      setErro("A data de nascimento não confere com o cadastro do aluno.");
      return;
    }
    onLiberado(row, iso);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-zampieri-green-dark" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Confirme a identidade</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Para proteger os dados de <strong>{aluno.nome_aluno}</strong>, informe a data de nascimento do aluno.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nasc">Data de nascimento do aluno</Label>
        <Input
          id="nasc"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={data}
          onChange={(e) => setData(maskDataBr(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button
          onClick={confirmar}
          disabled={loading}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Continuar
        </Button>
      </div>
    </div>
  );
};
