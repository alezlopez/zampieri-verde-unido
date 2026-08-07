import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isoToBr, maskCpf, maskTelefone } from "@/components/rematricula/utils";
import { STATUS_LABEL } from "@/components/prematricula/types";

interface Prematricula {
  id: string;
  protocolo: string;
  status: string;
  created_at: string;
  resp_nome: string;
  resp_email: string;
  resp_cpf: string;
  resp_whatsapp: string;
  aluno_nome: string;
  aluno_nascimento: string;
  serie_pretendida: string;
  turno_preferencia: string;
  escola_atual: string | null;
  tipo_escola: string | null;
  repetiu_ano: string | null;
  boletim_path: string | null;
  dificuldade_aprendizagem: string | null;
  atendimento_complementar: string | null;
  dificuldade_atencao: string | null;
  diagnostico: string | null;
  diagnostico_detalhe: string | null;
  laudo_path: string | null;
  dificuldade_socializacao: string | null;
  usa_medicacao: string | null;
  medicacao_detalhe: string | null;
  alergias: string | null;
  observacoes_saude: string | null;
  motivo_reprovacao: string | null;
  desconto_percentual: number | null;
  observacoes_entrevista: string | null;
  agendado_em: string | null;
}

interface Agendamento {
  prematricula_id: string;
  inicio: string;
  status: string;
}

const CORES: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  aprovado_aguardando_agendamento: "bg-blue-100 text-blue-800",
  reprovado: "bg-red-100 text-red-700",
  entrevista_agendada: "bg-violet-100 text-violet-800",
  entrevista_concluida: "bg-emerald-100 text-emerald-800",
};

const DESCONTOS = [5, 10, 15, 20, 25, 30];

const dataHora = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso))
    : "—";

const Linha = ({ rotulo, valor }: { rotulo: string; valor?: string | null }) => (
  <div className="text-sm">
    <span className="text-muted-foreground">{rotulo}: </span>
    <span className="font-medium">{valor || "—"}</span>
  </div>
);

const PreMatriculaAdmin = () => {
  const { toast } = useToast();
  const [lista, setLista] = useState<Prematricula[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [aberta, setAberta] = useState<Prematricula | null>(null);
  const [motivo, setMotivo] = useState("");
  const [desconto, setDesconto] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const [slots, setSlots] = useState<{ inicio: string; texto: string }[] | null>(null);
  const [novoHorario, setNovoHorario] = useState("");

  useEffect(() => {
    document.title = "Pré-matrículas — Painel Administrativo";
  }, []);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: pms }, { data: ags }] = await Promise.all([
      supabase.from("prematriculas").select("*").order("created_at", { ascending: false }),
      supabase
        .from("prematricula_agendamentos")
        .select("prematricula_id, inicio, status")
        .eq("status", "agendado"),
    ]);
    setLista((pms as Prematricula[]) ?? []);
    setAgendamentos((ags as Agendamento[]) ?? []);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const horarioDe = (id: string) =>
    agendamentos.find((a) => a.prematricula_id === id)?.inicio ?? null;

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return lista.filter((p) => {
      if (filtro !== "todos" && p.status !== filtro) return false;
      if (!t) return true;
      return (
        p.aluno_nome.toLowerCase().includes(t) ||
        p.resp_nome.toLowerCase().includes(t) ||
        p.protocolo.toLowerCase().includes(t) ||
        p.resp_cpf.includes(t.replace(/\D/g, ""))
      );
    });
  }, [lista, busca, filtro]);

  const executar = async (acao: string, extra: Record<string, unknown> = {}) => {
    if (!aberta) return;
    setAcaoEmCurso(true);
    const { data, error } = await supabase.functions.invoke("prematricula-admin-acao", {
      body: { acao, id: aberta.id, ...extra },
    });
    setAcaoEmCurso(false);
    if (error || !data?.ok) {
      toast({
        title: "Não foi possível concluir",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Pronto!", description: "Status atualizado e responsável notificado." });
    setAberta(null);
    setSlots(null);
    setNovoHorario("");
    setMotivo("");
    setDesconto("");
    setObservacoes("");
    carregar();
  };

  const carregarSlots = async () => {
    if (!aberta) return;
    setAcaoEmCurso(true);
    const { data, error } = await supabase.functions.invoke("prematricula-admin-acao", {
      body: { acao: "slots", id: aberta.id },
    });
    setAcaoEmCurso(false);
    if (error || !data?.ok) {
      toast({ title: "Não foi possível carregar os horários", variant: "destructive" });
      return;
    }
    setSlots((data.slots as { inicio: string; texto: string }[]) ?? []);
    setNovoHorario("");
  };

  const abrirArquivo = async (campo: "boletim" | "laudo") => {
    if (!aberta) return;
    const { data, error } = await supabase.functions.invoke("prematricula-admin-acao", {
      body: { acao: "arquivo_url", id: aberta.id, campo },
    });
    if (error || !data?.url) {
      toast({ title: "Arquivo indisponível", variant: "destructive" });
      return;
    }
    window.open(data.url as string, "_blank", "noopener");
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">Pré-matrículas</h1>
            <p className="text-xs text-muted-foreground">
              Conferência de CPF, agendamento e entrevista familiar.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por aluno, responsável, CPF ou protocolo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {carregando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filtradas.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setAberta(p);
                  setDesconto(p.desconto_percentual ? String(p.desconto_percentual) : "");
                  setObservacoes(p.observacoes_entrevista ?? "");
                }}
                className="text-left rounded-lg border border-border bg-white p-4 transition-colors hover:border-zampieri-green-dark"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zampieri-green-dark truncate">
                      {p.aluno_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.serie_pretendida} · {p.turno_preferencia} · resp. {p.resp_nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.desconto_percentual != null && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {p.desconto_percentual}% desconto
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[p.status] ?? "bg-muted"}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Protocolo {p.protocolo} · enviado em {dataHora(p.created_at)}
                  {horarioDe(p.id) ? ` · entrevista ${dataHora(horarioDe(p.id))}` : ""}
                </p>
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nenhuma pré-matrícula encontrada.
              </p>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-zampieri-green-dark">
                  {aberta.aluno_nome}
                </DialogTitle>
                <DialogDescription>
                  Protocolo {aberta.protocolo} · {STATUS_LABEL[aberta.status] ?? aberta.status}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <section className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Responsável
                  </p>
                  <Linha rotulo="Nome" valor={aberta.resp_nome} />
                  <Linha rotulo="CPF" valor={maskCpf(aberta.resp_cpf)} />
                  <Linha rotulo="WhatsApp" valor={maskTelefone(aberta.resp_whatsapp)} />
                  <Linha rotulo="E-mail" valor={aberta.resp_email} />
                </section>

                <section className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Aluno</p>
                  <Linha rotulo="Nascimento" valor={isoToBr(aberta.aluno_nascimento)} />
                  <Linha rotulo="Série pretendida" valor={aberta.serie_pretendida} />
                  <Linha rotulo="Turno" valor={aberta.turno_preferencia} />
                  <Linha rotulo="Escola atual" valor={aberta.escola_atual} />
                  <Linha rotulo="Tipo de escola" valor={aberta.tipo_escola} />
                </section>

                <section className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Histórico e desenvolvimento
                  </p>
                  <Linha rotulo="Repetiu ano" valor={aberta.repetiu_ano} />
                  <Linha rotulo="Dificuldade de aprendizagem" valor={aberta.dificuldade_aprendizagem} />
                  <Linha rotulo="Atendimento complementar" valor={aberta.atendimento_complementar} />
                  <Linha rotulo="Dificuldade de atenção" valor={aberta.dificuldade_atencao} />
                  <Linha rotulo="Diagnóstico" valor={aberta.diagnostico} />
                  <Linha rotulo="Detalhe do diagnóstico" valor={aberta.diagnostico_detalhe} />
                  <Linha rotulo="Socialização" valor={aberta.dificuldade_socializacao} />
                </section>

                <section className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Saúde</p>
                  <Linha rotulo="Medicação contínua" valor={aberta.usa_medicacao} />
                  <Linha rotulo="Detalhe da medicação" valor={aberta.medicacao_detalhe} />
                  <Linha rotulo="Alergias / restrições" valor={aberta.alergias} />
                  <Linha rotulo="Observações" valor={aberta.observacoes_saude} />
                </section>

                {(aberta.boletim_path || aberta.laudo_path) && (
                  <section className="flex flex-wrap gap-2">
                    {aberta.boletim_path && (
                      <Button variant="outline" size="sm" onClick={() => abrirArquivo("boletim")}>
                        Ver boletim
                      </Button>
                    )}
                    {aberta.laudo_path && (
                      <Button variant="outline" size="sm" onClick={() => abrirArquivo("laudo")}>
                        Ver laudo / relatório
                      </Button>
                    )}
                  </section>
                )}

                {aberta.status === "pendente" && (
                  <section className="space-y-3 rounded-lg border border-border p-4">
                    <p className="text-sm font-medium">Conferência de CPF</p>
                    <div className="space-y-2">
                      <Label>Motivo (em caso de reprovação)</Label>
                      <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
                        disabled={acaoEmCurso}
                        onClick={() => executar("aprovar")}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={acaoEmCurso}
                        onClick={() => executar("reprovar", { motivo })}
                      >
                        Reprovar
                      </Button>
                    </div>
                  </section>
                )}

                {aberta.status === "aprovado_aguardando_agendamento" && (
                  <section className="space-y-3 rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      Aguardando o responsável escolher o horário da entrevista.
                    </p>
                    <Button
                      variant="outline"
                      disabled={acaoEmCurso}
                      onClick={() => executar("reenviar_link")}
                    >
                      Reenviar link de agendamento
                    </Button>
                  </section>
                )}

                {aberta.status === "entrevista_agendada" && (
                  <section className="space-y-3 rounded-lg border border-border p-4">
                    <p className="text-sm font-medium">
                      Entrevista em {dataHora(horarioDe(aberta.id))}
                    </p>
                    <div className="space-y-2">
                      <Label>Desconto aplicado</Label>
                      <Select value={desconto} onValueChange={setDesconto}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o percentual" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {DESCONTOS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações da entrevista</Label>
                      <Textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
                        disabled={acaoEmCurso || !desconto}
                        onClick={() =>
                          executar("concluir_entrevista", {
                            desconto: Number(desconto),
                            observacoes,
                          })
                        }
                      >
                        Concluir entrevista
                      </Button>
                      <Button
                        variant="outline"
                        disabled={acaoEmCurso}
                        onClick={() => executar("cancelar_agendamento")}
                      >
                        Cancelar horário
                      </Button>
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                      {slots === null ? (
                        <Button variant="outline" disabled={acaoEmCurso} onClick={carregarSlots}>
                          Reagendar entrevista
                        </Button>
                      ) : (
                        <>
                          <Label>Novo horário</Label>
                          <Select value={novoHorario} onValueChange={setNovoHorario}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o horário" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50 max-h-72">
                              {slots.map((s) => (
                                <SelectItem key={s.inicio} value={s.inicio}>
                                  {s.texto}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {slots.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Nenhum horário disponível na agenda.
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
                              disabled={acaoEmCurso || !novoHorario}
                              onClick={() => executar("reagendar", { inicio: novoHorario })}
                            >
                              Confirmar reagendamento
                            </Button>
                            <Button variant="ghost" onClick={() => setSlots(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                )}

                {aberta.status === "entrevista_concluida" && (
                  <section className="space-y-1 rounded-lg border border-border p-4">
                    <Linha rotulo="Desconto aplicado" valor={`${aberta.desconto_percentual}%`} />
                    <Linha rotulo="Observações" valor={aberta.observacoes_entrevista} />
                  </section>
                )}

                {aberta.status === "reprovado" && (
                  <section className="rounded-lg border border-border p-4">
                    <Linha rotulo="Motivo" valor={aberta.motivo_reprovacao} />
                  </section>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreMatriculaAdmin;
