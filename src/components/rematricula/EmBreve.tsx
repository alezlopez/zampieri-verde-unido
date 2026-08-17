import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoZampieri from "@/assets/logo-zampieri.png";
import { Button } from "@/components/ui/button";
import { REMATRICULA_ABERTURA } from "./utils";

const dois = (n: number) => String(n).padStart(2, "0");

const restante = () => Math.max(0, REMATRICULA_ABERTURA.getTime() - Date.now());

export const RematriculaEmBreve = ({ onAbrir }: { onAbrir: () => void }) => {
  const [ms, setMs] = useState(restante);

  useEffect(() => {
    const t = setInterval(() => {
      const r = restante();
      setMs(r);
      if (r <= 0) onAbrir();
    }, 1000);
    return () => clearInterval(t);
  }, [onAbrir]);

  const total = Math.floor(ms / 1000);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const min = Math.floor((total % 3600) / 60);
  const seg = total % 60;

  const blocos = [
    { valor: dias, label: "dias" },
    { valor: horas, label: "horas" },
    { valor: min, label: "min" },
    { valor: seg, label: "seg" },
  ];

  return (
    <main className="min-h-screen bg-zampieri-cream/30 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-2xl bg-white border border-border p-8 text-center space-y-6">
        <img src={logoZampieri} alt="Colégio Zampieri" className="h-16 mx-auto" />
        <div className="space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-zampieri-green-dark">
            Rematrícula 2027 começa em 24/08
          </h1>
          <p className="text-sm text-muted-foreground">
            O formulário de rematrícula será liberado automaticamente à meia-noite do dia
            24 de agosto. Enquanto isso, confira o informativo e o regulamento.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {blocos.map((b) => (
            <div key={b.label} className="rounded-xl bg-zampieri-green-dark text-white py-3">
              <div className="text-2xl font-bold tabular-nums">{dois(b.valor)}</div>
              <div className="text-[11px] uppercase tracking-wide opacity-80">{b.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="bg-zampieri-green-dark hover:bg-zampieri-green">
            <Link to="/rematricula2027/informativo">Ver informativo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/rematricula2027/regulamento">Ler regulamento</Link>
          </Button>
        </div>

        <Button asChild variant="ghost" className="w-full">
          <a href="/">Voltar ao site</a>
        </Button>
      </div>
    </main>
  );
};

export default RematriculaEmBreve;
