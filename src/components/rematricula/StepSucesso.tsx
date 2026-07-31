import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  nomeAluno: string;
  curso: string | null;
  turno: string;
  linkContrato?: string | null;
}

export const StepSucesso = ({ nomeAluno, curso, turno, linkContrato }: Props) => (
  <div className="text-center space-y-4 py-4">
    <div className="w-16 h-16 rounded-full bg-zampieri-cream mx-auto flex items-center justify-center">
      <CheckCircle2 className="w-8 h-8 text-zampieri-green-dark" />
    </div>
    <h2 className="font-serif text-2xl font-bold text-zampieri-green-dark">Dados enviados com sucesso!</h2>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">
      A rematrícula de <strong>{nomeAluno}</strong> para <strong>{curso || "2027"}</strong>
      {turno ? ` no turno da ${turno.toLowerCase()}` : ""} foi registrada. O contrato de rematrícula está sendo
      gerado para assinatura digital.
    </p>

    {linkContrato ? (
      <div className="rounded-lg border border-zampieri-gold bg-zampieri-cream/50 p-4 max-w-md mx-auto space-y-3">
        <p className="text-sm font-medium text-zampieri-green-dark">Seu contrato está pronto para assinatura.</p>
        <a href={linkContrato} target="_blank" rel="noopener noreferrer">
          <Button className="w-full bg-zampieri-green-dark hover:bg-zampieri-green">
            <FileSignature className="w-4 h-4 mr-2" />
            Assinar contrato
          </Button>
        </a>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Gerando contrato…
      </div>
    )}

    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
      <a href="https://wa.me/5511939341503" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="w-full sm:w-auto">
          Falar com a secretaria
        </Button>
      </a>
      <Link to="/">
        <Button variant="outline" className="w-full sm:w-auto">
          Voltar ao site
        </Button>
      </Link>
    </div>
  </div>
);
