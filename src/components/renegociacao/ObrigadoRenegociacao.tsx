import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

/** Página de obrigado do pagamento de débitos, exibida em /rematricula2027?renegociacao=paga. */
export const ObrigadoRenegociacao = () => (
  <section
    role="status"
    className="rounded-xl border border-zampieri-green-dark/30 bg-white p-5 md:p-6 shadow-sm mb-5 space-y-3"
  >
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-7 h-7 text-zampieri-green-dark shrink-0" aria-hidden="true" />
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Pagamento recebido, obrigado!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          O PIX é confirmado em instantes; no cartão, pode levar alguns minutos. Assim que o pagamento for confirmado,
          os débitos pagos são baixados automaticamente.
        </p>
      </div>
    </div>
    <div className="rounded-lg bg-zampieri-cream/70 p-4 text-sm text-foreground space-y-1">
      <p>
        <strong>Quitou todos os débitos?</strong> Localize o aluno abaixo e siga com a rematrícula 2027. O pagamento
        da rematrícula é feito à parte, nesta página.
      </p>
      <p>
        Se ainda restar algum débito, a rematrícula continua bloqueada até a quitação total. Você pode pagar o
        restante em{" "}
        <Link to="/renegociacao" className="font-semibold text-zampieri-green-dark underline">
          colegiozampieri.com.br/renegociacao
        </Link>
        .
      </p>
    </div>
  </section>
);
