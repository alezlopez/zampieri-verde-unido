import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlunoCompleto } from "./types";
import { isValidCpf, isoToBr, maskCpf } from "./utils";

interface Props {
  aluno: AlunoCompleto;
  cpf: string;
  semCpf: boolean;
  onChange: (v: { cpf: string; semCpf: boolean }) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

export const StepAluno = ({ aluno, cpf, semCpf, onChange, onVoltar, onAvancar }: Props) => {
  const [erro, setErro] = useState<string | null>(null);
  const cpfJaCadastrado = !!aluno.cpf_aluno;

  const avancar = () => {
    if (!cpfJaCadastrado && !semCpf) {
      if (!isValidCpf(cpf)) {
        setErro("Informe um CPF válido ou marque que o aluno não possui CPF.");
        return;
      }
    }
    setErro(null);
    onAvancar();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Dados do aluno</h2>
        <p className="text-sm text-muted-foreground mt-1">Confira as informações abaixo.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do aluno</Label>
          <Input value={aluno.nome_aluno} readOnly className="bg-muted" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input value={isoToBr(aluno.data_nascimento_aluno)} readOnly className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Curso atual</Label>
            <Input value={aluno.curso_atual || "—"} readOnly className="bg-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf-aluno">CPF do aluno</Label>
          {cpfJaCadastrado ? (
            <Input value={maskCpf(aluno.cpf_aluno || "")} readOnly className="bg-muted" />
          ) : (
            <>
              <Input
                id="cpf-aluno"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                disabled={semCpf}
                onChange={(e) => onChange({ cpf: maskCpf(e.target.value), semCpf })}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={semCpf}
                  onChange={(e) => onChange({ cpf: e.target.checked ? "" : cpf, semCpf: e.target.checked })}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                O aluno não possui CPF
              </label>
            </>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button onClick={avancar} className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green">
          Continuar
        </Button>
      </div>
    </div>
  );
};
