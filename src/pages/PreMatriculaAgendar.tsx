import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Slot {
  inicio: string;
  fim: string;
  texto: string;
}

interface Info {
  protocolo: string;
  aluno_nome: string;
  resp_nome: string;
  status: string;
  agendamento: { inicio: string; texto: string } | null;
  slots: Slot[];
}

const diaLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));

const horaLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const PreMatriculaAgendar = () => {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const { toast } = useToast();
  const [info, setInfo] = useState<Info | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Agendar entrevista familiar — Colégio Zampieri";
  }, []);

  useEffect(() => {
    const carregar = async () => {
      if (!token) {
        setErro("Link inválido.");
        setCarregando(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("prematricula-agenda", {
        body: { token, acao: "info" },
      });
      setCarregando(false);
      if (error || !data?.ok) {
        setErro("Não encontramos este agendamento. Confira o link recebido.");
        return;
      }
      setInfo(data as Info);
    };
    carregar();
  }, [token]);

  const porDia = useMemo(() => {
    const grupos = new Map<string, Slot[]>();
    (info?.slots ?? []).forEach((s) => {
      const chave = diaLabel(s.inicio);
      grupos.set(chave, [...(grupos.get(chave) ?? []), s]);
    });
    return Array.from(grupos.entries());
  }, [info]);

  const agendar = async () => {
    if (!escolhido) return;
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke("prematricula-agenda", {
      body: { token, acao: "agendar", inicio: escolhido },
    });
    setSalvando(false);
    if (error || !data?.ok) {
      toast({
        title: "Horário indisponível",
        description: "Esse horário acabou de ser preenchido. Escolha outro, por favor.",
        variant: "destructive",
      });
      const { data: novo } = await supabase.functions.invoke("prematricula-agenda", {
        body: { token, acao: "info" },
      });
      if (novo?.ok) setInfo(novo as Info);
      setEscolhido(null);
      return;
    }
    setInfo((p) => (p ? { ...p, status: "entrevista_agendada", agendamento: data.agendamento } : p));
  };

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </main>
    );
  }

  if (erro || !info) {
    return (
      <main className="min-h-screen bg-zampieri-cream/30 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl bg-white border border-border p-8 text-center space-y-4">
          <CalendarCheck className="w-10 h-10 mx-auto text-zampieri-green-dark" />
          <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
            Link de agendamento necessário
          </h1>
          <p className="text-sm text-muted-foreground">
            {erro ?? "Não encontramos este agendamento."} Esta página só abre pelo link
            personalizado enviado por WhatsApp/e-mail após a aprovação da pré-matrícula.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="bg-zampieri-green-dark hover:bg-zampieri-green">
              <a href="/prematricula">Fazer pré-matrícula</a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://wa.me/5511939341503" target="_blank" rel="noreferrer">
                Falar com a secretaria
              </a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const jaAgendado = info.status === "entrevista_agendada" || info.status === "entrevista_concluida";

  return (
    <main className="min-h-screen bg-zampieri-cream/30 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
            Entrevista Familiar
          </h1>
          <p className="text-sm text-muted-foreground">
            Aluno(a) <strong>{info.aluno_nome}</strong> — protocolo {info.protocolo}
          </p>
        </header>

        {jaAgendado && info.agendamento ? (
          <div className="rounded-2xl bg-white border border-border p-8 text-center space-y-3">
            <CalendarCheck className="w-10 h-10 mx-auto text-zampieri-green-dark" />
            <p className="font-semibold text-zampieri-green-dark">Entrevista agendada</p>
            <p className="text-sm text-muted-foreground">{info.agendamento.texto}</p>
            <p className="text-xs text-muted-foreground">
              Precisa remarcar? Fale com a secretaria pelo WhatsApp.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-border p-6 sm:p-8 space-y-5">
            <p className="text-sm text-muted-foreground">
              Escolha o melhor dia e horário para a conversa com nossa equipe pedagógica.
            </p>

            {porDia.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No momento não há horários abertos. Entraremos em contato para agendar.
              </p>
            )}

            <div className="space-y-5">
              {porDia.map(([dia, slots]) => (
                <div key={dia} className="space-y-2">
                  <p className="text-sm font-semibold capitalize text-foreground">{dia}</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.inicio}
                        type="button"
                        onClick={() => setEscolhido(s.inicio)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          escolhido === s.inicio
                            ? "border-zampieri-green-dark bg-zampieri-green-dark text-white"
                            : "border-border hover:border-zampieri-green-dark"
                        }`}
                      >
                        {horaLabel(s.inicio)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
              disabled={!escolhido || salvando}
              onClick={agendar}
            >
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar agendamento
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default PreMatriculaAgendar;
