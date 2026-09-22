import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type Etapa = "agendar" | "lembrete" | "faltou" | "documentos" | "contrato";

interface Envio {
  etapa: string;
  sequencia: number;
  template: string;
  destino: string | null;
  sucesso: boolean;
  enviado_em: string;
}

interface Caso {
  id: string;
  protocolo: string | null;
  token: string | null;
  aluno_nome: string;
  resp_nome: string | null;
  resp_whatsapp: string | null;
  resp_email: string | null;
  serie_pretendida: string | null;
  turno_preferencia: string | null;
  status: string;
  followup_pausado: boolean | null;
  aprovado_em: string | null;
  entrevista_concluida_em: string | null;
  created_at: string;
  updated_at: string | null;
  entrevista_inicio: string | null;
  matricula_id: string | null;
  matricula_status: string | null;
  contrato_gerado: boolean | null;
  contrato_assinado: boolean | null;
  resp_fin_nome: string | null;
  resp_fin_celular: string | null;
  documentos_aprovados_em: string | null;
  matricula_updated_at: string | null;
  vagas_restantes: number;
  sem_vaga: boolean;
  envios: Envio[] | null;
}

const ETAPAS: { id: Etapa; titulo: string; descricao: string; msgs: number }[] = [
  {
    id: "agendar",
    titulo: "Aprovado e não agendou",
    descricao: "Pré-matrícula aprovada, entrevista ainda não marcada",
    msgs: 3,
  },
  {
    id: "lembrete",
    titulo: "Entrevista marcada",
    descricao: "Lembretes 1 dia antes e 2 horas antes",
    msgs: 2,
  },
  {
    id: "faltou",
    titulo: "Não compareceu",
    descricao: "Passou do horário e a entrevista não foi concluída",
    msgs: 1,
  },
  {
    id: "documentos",
    titulo: "Documentos pendentes",
    descricao: "Entrevista concluída, documentos não aprovados",
    msgs: 3,
  },
  {
    id: "contrato",
    titulo: "Contrato pendente",
    descricao: "Documentos aprovados, contrato não gerado ou não assinado",
    msgs: 3,
  },
];

const etapaDe = (c: Caso): Etapa | null => {
  if (c.status === "aprovado_aguardando_agendamento") return "agendar";
  if (c.status === "entrevista_agendada") {
    if (!c.entrevista_inicio) return null;
    const passou = new Date(c.entrevista_inicio).getTime() < Date.now() - 2 * 3600000;
    return passou ? "faltou" : "lembrete";
  }
  if (c.status === "entrevista_concluida") {
    if (c.contrato_assinado) return null;
    if (["documentos_aprovados", "contrato_gerado"].includes(c.matricula_status || "")) {
      return "contrato";
    }
    return "documentos";
  }
  return null;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const diasDesde = (iso: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null;

const wa = (tel: string | null) => {
  const d = (tel || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
};

const MatriculaFollowup = () => {
  const { loading: authLoading, podeAcessar } = useAuth();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("agendar");
  const [soPausados, setSoPausados] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Follow-up — Matrículas (alunos novos)";
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("matricula_followup_listagem" as never);
    if (error) toast({ title: "Não foi possível carregar a lista", variant: "destructive" });
    setCasos((data as unknown as Caso[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (podeAcessar("matricula")) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeAcessar("matricula")]);

  const alternarPausa = async (c: Caso, pausado: boolean) => {
    setCasos((prev) => prev.map((x) => (x.id === c.id ? { ...x, followup_pausado: pausado } : x)));
    const { error } = await supabase.rpc("matricula_followup_pausar" as never, {
      _id: c.id,
      _pausado: pausado,
    } as never);
    if (error) {
      toast({ title: "Não foi possível alterar o follow-up", variant: "destructive" });
      carregar();
    }
  };

  const reenviar = async (c: Caso, sequencia: number) => {
    setEnviando(`${c.id}-${sequencia}`);
    const { data, error } = await supabase.functions.invoke("matricula-followup", {
      body: { modo: "manual", id: c.id, etapa, sequencia },
    });
    setEnviando(null);
    if (error || (data as any)?.error || (data as any)?.ok === false) {
      toast({ title: "Falha ao enviar a mensagem", variant: "destructive" });
      return;
    }
    toast({ title: `Mensagem ${sequencia} enviada`, description: c.aluno_nome });
    carregar();
  };

  const porEtapa = useMemo(() => {
    const mapa = {
      agendar: [],
      lembrete: [],
      faltou: [],
      documentos: [],
      contrato: [],
    } as Record<Etapa, Caso[]>;
    casos.forEach((c) => {
      const e = etapaDe(c);
      if (e) mapa[e].push(c);
    });
    return mapa;
  }, [casos]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return porEtapa[etapa]
      .filter(
        (c) =>
          (!soPausados || c.followup_pausado) &&
          (!termo ||
            c.aluno_nome.toLowerCase().includes(termo) ||
            (c.resp_nome || "").toLowerCase().includes(termo) ||
            (c.protocolo || "").toLowerCase().includes(termo)),
      )
      .sort((a, b) => {
        if (etapa === "lembrete" || etapa === "faltou") {
          return (a.entrevista_inicio || "").localeCompare(b.entrevista_inicio || "");
        }
        return (b.updated_at || "").localeCompare(a.updated_at || "");
      });
  }, [porEtapa, etapa, busca, soPausados]);

  if (authLoading || !podeAcessar("matricula")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  const etapaAtual = ETAPAS.find((e) => e.id === etapa)!;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/prematricula/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-zampieri-green-dark"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao painel
            </Link>
            <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
              Follow-up de matrículas (alunos novos)
            </h1>
            <p className="text-sm text-muted-foreground">
              Quem parou em cada etapa do funil de aluno novo, com os contatos e as mensagens já enviadas.
            </p>
          </div>
          <Button variant="outline" onClick={carregar} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ETAPAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEtapa(e.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                etapa === e.id
                  ? "border-zampieri-green-dark bg-white shadow-sm"
                  : "border-border bg-white/60 hover:border-zampieri-green-dark/50"
              }`}
            >
              <p className="text-2xl font-bold text-zampieri-green-dark">
                {porEtapa[e.id].length}
              </p>
              <p className="text-sm font-medium">{e.titulo}</p>
              <p className="text-xs text-muted-foreground">{e.descricao}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por aluno, responsável ou protocolo"
              className="pl-9 bg-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={soPausados} onCheckedChange={setSoPausados} />
            Só com follow-up pausado
          </label>
        </div>

        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {etapaAtual.descricao} · {lista.length} caso(s)
          </p>

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
            </div>
          )}

          {!loading && lista.length === 0 && (
            <p className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
              Nenhum caso nesta etapa.
            </p>
          )}

          {lista.map((c) => {
            const envios = (c.envios || []).filter((e) => e.etapa === etapa);
            const tel = c.resp_fin_celular || c.resp_whatsapp;
            const link = wa(tel);
            return (
              <article key={c.id} className="rounded-lg border bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zampieri-green-dark">{c.aluno_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.serie_pretendida} · {c.turno_preferencia}
                      {c.protocolo ? ` · ${c.protocolo}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Responsável: {c.resp_fin_nome || c.resp_nome || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {etapa === "agendar" &&
                      (c.sem_vaga ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">
                          <AlertTriangle className="w-3 h-3" /> Sem vaga
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                          <CheckCircle2 className="w-3 h-3" /> {c.vagas_restantes} vaga(s)
                        </span>
                      ))}
                    {(etapa === "lembrete" || etapa === "faltou") && c.entrevista_inicio && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        <CalendarClock className="w-3 h-3" /> {dataHora(c.entrevista_inicio)}
                      </span>
                    )}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zampieri-green-dark hover:underline"
                      >
                        <MessageCircle className="w-3 h-3" /> {tel}
                      </a>
                    )}
                    {c.resp_email && (
                      <a
                        href={`mailto:${c.resp_email}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        <Mail className="w-3 h-3" /> {c.resp_email}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  {Array.from({ length: etapaAtual.msgs }, (_, i) => i + 1).map((seq) => {
                    const env = envios.find((e) => e.sequencia === seq);
                    return (
                      <Button
                        key={seq}
                        size="sm"
                        variant={env ? "outline" : "default"}
                        disabled={enviando === `${c.id}-${seq}`}
                        onClick={() => reenviar(c, seq)}
                      >
                        {enviando === `${c.id}-${seq}` ? (
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 mr-2" />
                        )}
                        {env ? `Reenviar ${seq} · ${dataHora(env.enviado_em)}` : `Enviar mensagem ${seq}`}
                      </Button>
                    );
                  })}
                  <span className="text-xs text-muted-foreground">
                    {diasDesde(c.matricula_updated_at || c.updated_at) ?? 0} dia(s) sem avanço
                  </span>
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={!!c.followup_pausado}
                      onCheckedChange={(v) => alternarPausa(c, v)}
                    />
                    Pausar follow-up
                  </label>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};

export default MatriculaFollowup;
