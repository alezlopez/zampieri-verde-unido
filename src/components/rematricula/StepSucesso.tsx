import { AlertCircle, CheckCircle2, FileSignature, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { StepPagamento, StatusRematricula } from "./StepPagamento";

interface Props {
  nomeAluno: string;
  curso: string | null;
  turno: string;
  linkContrato?: string | null;
  erroContrato?: string | null;
  gerandoContrato?: boolean;
  onTentarContrato: () => void;
  jaAssinado?: boolean;
  retomada?: boolean;
  idAluno: number;
  dataNascimento: string;
  status: StatusRematricula | null;
  verificando: boolean;
  onVerificar: () => void;
  aguardandoPagamento?: boolean;
}

export const StepSucesso = ({
  nomeAluno,
  curso,
  turno,
  linkContrato,
  erroContrato,
  gerandoContrato,
  onTentarContrato,
  jaAssinado,
  retomada,
  idAluno,
  dataNascimento,
  status,
  verificando,
  onVerificar,
  aguardandoPagamento,
}: Props) => {
  const assinado = !!(jaAssinado || status?.contrato_assinado);
  const concluida = !!status?.rematricula_concluida;
  const etapas = [
    { titulo: "Dados enviados", ok: true },
    { titulo: "Contrato assinado", ok: assinado },
    { titulo: "Pagamento e conclusão", ok: concluida },
  ];
  const etapaAtiva = concluida ? 3 : assinado ? 3 : 2;

  return (
  <div className="text-center space-y-4 py-4">
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-left">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Etapa {etapaAtiva} de 3 — a rematrícula só é concluída após o pagamento, que é liberado
        depois da assinatura do contrato.
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {etapas.map((e, i) => (
          <li
            key={e.titulo}
            className={`flex items-center gap-2 rounded-md border p-2 text-xs ${
              e.ok
                ? "border-zampieri-green-dark bg-zampieri-cream/50 text-zampieri-green-dark"
                : i + 1 === etapaAtiva
                  ? "border-zampieri-gold bg-white text-zampieri-green-dark"
                  : "border-border bg-white text-muted-foreground"
            }`}
          >
            {e.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <span className="w-4 h-4 shrink-0 rounded-full border border-current text-[10px] leading-4 text-center">
                {i + 1}
              </span>
            )}
            <span className="font-medium">{e.titulo}</span>
          </li>
        ))}
      </ol>
    </div>
    <div className="w-16 h-16 rounded-full bg-zampieri-cream mx-auto flex items-center justify-center">
      <CheckCircle2 className="w-8 h-8 text-zampieri-green-dark" />
    </div>
    <h2 className="font-serif text-2xl font-bold text-zampieri-green-dark">
      {jaAssinado
        ? "Contrato já assinado!"
        : retomada
          ? "Você já tem um contrato gerado"
          : "Dados enviados com sucesso!"}
    </h2>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">
      {jaAssinado ? (
        <>
          O contrato de rematrícula de <strong>{nomeAluno}</strong> para <strong>{curso || "2027"}</strong> já foi
          assinado. Nossa secretaria dará sequência ao processo.
        </>
      ) : (
        <>
          A rematrícula de <strong>{nomeAluno}</strong> para <strong>{curso || "2027"}</strong>
          {turno ? ` no turno da ${turno.toLowerCase()}` : ""} {retomada ? "já foi registrada" : "foi registrada"}.
          {retomada
            ? " Falta apenas a assinatura digital do contrato."
            : " O contrato de rematrícula está sendo gerado para assinatura digital."}
        </>
      )}
    </p>

    {jaAssinado || status?.contrato_assinado ? null : linkContrato ? (
      <div className="rounded-lg border border-zampieri-gold bg-zampieri-cream/50 p-4 max-w-md mx-auto space-y-3">
        <p className="text-sm font-medium text-zampieri-green-dark">Seu contrato está pronto para assinatura.</p>
        <a href={linkContrato} target="_blank" rel="noopener noreferrer">
          <Button className="w-full bg-zampieri-green-dark hover:bg-zampieri-green">
            <FileSignature className="w-4 h-4 mr-2" />
            Assinar contrato
          </Button>
        </a>
      </div>
    ) : erroContrato ? (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 max-w-md mx-auto space-y-3">
        <div className="flex items-start gap-2 text-left">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Não foi possível gerar o contrato</p>
            <p className="text-sm text-muted-foreground mt-1">{erroContrato}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={onTentarContrato} disabled={gerandoContrato}>
          {gerandoContrato ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Tentar novamente
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Gerando contrato…
      </div>
    )}

    <div className="max-w-md mx-auto">
      <StepPagamento
        idAluno={idAluno}
        dataNascimento={dataNascimento}
        status={status}
        verificando={verificando}
        onVerificar={onVerificar}
        aguardandoPagamento={aguardandoPagamento}
      />
    </div>




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
};
