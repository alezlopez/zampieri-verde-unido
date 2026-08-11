import { Check } from "lucide-react";

interface Props {
  etapaAtual: number;
  status: string;
  /** Matrícula isenta: a última etapa é apenas a conclusão, sem pagamento. */
  gratuita?: boolean;
}

const RoadmapEtapas = ({ etapaAtual, status, gratuita }: Props) => {
  const ETAPAS = [
    { nome: "Documentos", acao: "Envie os documentos solicitados." },
    { nome: "Dados do contrato", acao: "Preencha os dados para o contrato." },
    { nome: "Assinatura", acao: "Assine o contrato digitalmente." },
    gratuita
      ? { nome: "Conclusão", acao: "Matrícula isenta de taxa — nada a pagar." }
      : { nome: "Pagamento", acao: "Faça o pagamento da matrícula." },
  ];
  const total = ETAPAS.length;
  const concluido = Math.min(etapaAtual, total);
  const percentual = Math.round((concluido / total) * 100);
  const finalizado = etapaAtual >= total;

  const acaoAtual = finalizado
    ? "Matrícula concluída. Seja bem-vindo à família Zampieri!"
    : etapaAtual === 0 && status === "documentos_em_analise"
      ? "Aguardando a conferência da secretaria (até 24 horas úteis)."
      : ETAPAS[etapaAtual]?.acao;

  return (
    <section
      aria-label="Progresso da matrícula"
      className="rounded-xl border border-border bg-white p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-zampieri-green-dark">
          {finalizado ? "Todas as etapas concluídas" : `Etapa ${etapaAtual + 1} de ${total}`}
        </p>
        <p className="text-xs text-muted-foreground">{percentual}% concluído</p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>

      {/* Trilha vertical (mobile) */}
      <ol className="mt-5 space-y-0 sm:hidden">
        {ETAPAS.map((e, i) => {
          const feito = i < etapaAtual;
          const atual = i === etapaAtual;
          return (
            <li key={e.nome} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                    feito
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : atual
                        ? "border-zampieri-green-dark bg-white text-zampieri-green-dark ring-4 ring-emerald-100"
                        : "border-border bg-white text-muted-foreground"
                  }`}
                >
                  {feito ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                {i < total - 1 && (
                  <span
                    className={`w-0.5 flex-1 transition-all ${feito ? "bg-emerald-600" : "bg-border"}`}
                  />
                )}
              </div>
              <div className={`pb-5 ${i === total - 1 ? "pb-0" : ""}`}>
                <p
                  className={`text-sm font-medium ${
                    atual ? "text-zampieri-green-dark" : feito ? "text-emerald-700" : "text-muted-foreground"
                  }`}
                >
                  {e.nome}
                </p>
                {atual && <p className="mt-0.5 text-xs text-muted-foreground">{acaoAtual}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Trilha horizontal (desktop) */}
      <ol className="mt-6 hidden sm:flex">
        {ETAPAS.map((e, i) => {
          const feito = i < etapaAtual;
          const atual = i === etapaAtual;
          return (
            <li key={e.nome} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={`absolute left-0 top-4 h-0.5 w-1/2 -translate-x-1/2 transition-all ${
                    i <= etapaAtual ? "bg-emerald-600" : "bg-border"
                  }`}
                />
              )}
              {i < total - 1 && (
                <span
                  className={`absolute right-0 top-4 h-0.5 w-1/2 translate-x-1/2 transition-all ${
                    i < etapaAtual ? "bg-emerald-600" : "bg-border"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                  feito
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : atual
                      ? "border-zampieri-green-dark bg-white text-zampieri-green-dark ring-4 ring-emerald-100"
                      : "border-border bg-white text-muted-foreground"
                }`}
              >
                {feito ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <p
                className={`mt-2 px-1 text-xs font-medium ${
                  atual ? "text-zampieri-green-dark" : feito ? "text-emerald-700" : "text-muted-foreground"
                }`}
              >
                {e.nome}
              </p>
            </li>
          );
        })}
      </ol>

      {acaoAtual && (
        <p className="mt-4 hidden rounded-lg bg-zampieri-cream/50 px-3 py-2 text-sm text-zampieri-green-dark sm:block">
          <strong className="font-semibold">Agora:</strong> {acaoAtual}
        </p>
      )}
    </section>
  );
};

export default RoadmapEtapas;
