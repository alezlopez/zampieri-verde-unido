import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface RadioProps {
  label: string;
  nome: string;
  opcoes: string[];
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
}

export const RadioGrupo = ({ label, nome, opcoes, valor, onChange, erro }: RadioProps) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="space-y-1.5">
      {opcoes.map((op) => (
        <label key={op} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={nome}
            value={op}
            checked={valor === op}
            onChange={() => onChange(op)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          {op}
        </label>
      ))}
    </div>
    {erro && <p className="text-xs text-destructive">{erro}</p>}
  </div>
);

export const Campo = ({
  label,
  erro,
  children,
  dica,
}: {
  label: string;
  erro?: string;
  children: ReactNode;
  dica?: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
    {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    {erro && <p className="text-xs text-destructive">{erro}</p>}
  </div>
);

export const SecaoTitulo = ({ children }: { children: ReactNode }) => (
  <h2 className="font-serif text-xl font-bold text-foreground">{children}</h2>
);
