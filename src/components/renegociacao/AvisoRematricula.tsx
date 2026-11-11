import { Info } from "lucide-react";
import { Link } from "react-router-dom";

/** Deixa claro que a renegociação quita débitos antigos e não paga a rematrícula 2027. */
export const AvisoRematricula = () => (
  <div role="note" className="rounded-lg border border-zampieri-gold/60 bg-zampieri-cream/70 p-4 flex gap-3">
    <Info className="w-5 h-5 text-zampieri-gold shrink-0 mt-0.5" aria-hidden="true" />
    <div className="text-sm text-foreground space-y-1">
      <p className="font-semibold text-zampieri-green-dark">Estes débitos não incluem a rematrícula 2027.</p>
      <p>
        Quitando <strong>todos</strong> os débitos desta lista, a rematrícula é liberada. O pagamento da rematrícula é
        feito à parte, em{" "}
        <Link to="/rematricula2027" className="font-semibold text-zampieri-green-dark underline">
          colegiozampieri.com.br/rematricula2027
        </Link>
        .
      </p>
    </div>
  </div>
);
