import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensagemAmigavel, mensagemDaFunction } from "@/lib/mensagensErro";
import { FunilFamilias } from "@/components/admin/FunilFamilias";

// Tabelas novas ainda não estão nos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = (nome: string) => supabase.from(nome as any);

interface Lead {
  id: string;
  created_at: string;
  origem: "visita" | "whatsapp" | "formulario";
  nome: string;
  whatsapp: string;
  serie: string;
  turno: string | null;
  ref: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  fbc: string | null;
  referrer: string | null;
  status: "novo" | "em_contato" | "convertido" | "perdido";
}

interface Visita {
  id: string;
  lead_id: string;
  inicio: string;
  status: "agendada" | "realizada" | "faltou" | "cancelada";
}

interface Regra {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  capacidade: number;
  ativo: boolean;
}

interface Bloqueio {
  id: string;
  data: string;
  motivo: string | null;
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const STATUS_VISITA: Record<Visita["status"], string> = { agendada: "Agendada", realizada: "Realizada", faltou: "Faltou", cancelada: "Cancelada" };

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const telefone = (d: string) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`);

const LeadsSiteAdmin = () => (
  <div className="min-h-screen bg-zampieri-cream/40">
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="font-serif text-3xl font-bold text-zampieri-green-dark">Leads e funil de matrículas</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Uma linha por família, de qualquer porta de entrada (site, WhatsApp, direto na pré-matrícula). A etapa se atualiza sozinha
        com as visitas, pré-matrículas e matrículas.
      </p>

      <Tabs defaultValue="funil">
        <TabsList>
          <TabsTrigger value="funil">Funil de famílias</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="agenda">Agenda de visitas</TabsTrigger>
        </TabsList>

        <TabsContent value="funil" className="mt-4">
          <FunilFamilias />
        </TabsContent>

        <TabsContent value="visitas" className="mt-4">
          <VisitasLista />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <AgendaVisitas />
        </TabsContent>
      </Tabs>
    </div>
  </div>
);

const LINK_REMARCAR = "https://colegiozampieri.com.br/informativomatricula?remarcar=1";
const dataLonga = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

interface Cancelada {
  id: string;
  inicio: string;
  nome: string | null;
  whatsapp: string | null;
  serie: string | null;
  aviso_enviado: boolean;
}

/** Mesmo texto do template de WhatsApp, para enviar à mão se o automático não sair. */
const mensagemCancelamento = (c: Cancelada) =>
  `Olá, ${(c.nome || "").trim().split(/\s+/)[0] || ""}! Precisamos cancelar a sua visita ao Colégio Zampieri marcada para ${dataLonga(c.inicio)}. ` +
  `Nesse dia não teremos atendimento. Pedimos desculpas! Para escolher outro dia e horário, acesse: ${LINK_REMARCAR}`;

const cancelarVisitas = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-visitas", { body });
  if (error || !data?.ok) {
    toast.error(await mensagemDaFunction(error, data));
    return null;
  }
  return data.canceladas as Cancelada[];
};

/** Resultado do cancelamento: quem foi avisado e o link de WhatsApp com a mensagem pronta. */
const ResultadoCancelamento = ({ lista, aoFechar }: { lista: Cancelada[] | null; aoFechar: () => void }) => (
  <Dialog open={!!lista} onOpenChange={(v) => !v && aoFechar()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{lista?.length === 1 ? "Visita cancelada" : `${lista?.length ?? 0} visitas canceladas`}</DialogTitle>
        <DialogDescription>
          Os horários voltaram a ficar livres. A mensagem automática pede para a família remarcar pelo site. Se alguém não
          receber, use o botão para mandar a mesma mensagem pelo WhatsApp.
        </DialogDescription>
      </DialogHeader>
      {lista?.length === 0 ? (
        <p className="text-sm">Não havia visitas agendadas nesse dia.</p>
      ) : (
        <ul className="divide-y text-sm">
          {lista?.map((c) => (
            <li key={c.id} className="py-3 space-y-1">
              <p className="font-medium">{c.nome} · {dataHora(c.inicio)}</p>
              <p className={c.aviso_enviado ? "text-zampieri-green-dark text-xs" : "text-amber-700 text-xs font-medium"}>
                {c.aviso_enviado ? "Mensagem automática enviada para o WhatsApp." : "Mensagem automática não enviada."}
              </p>
              {c.whatsapp && (
                <a
                  href={`https://wa.me/55${c.whatsapp}?text=${encodeURIComponent(mensagemCancelamento(c))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zampieri-green-dark underline"
                >
                  <MessageCircle className="w-3 h-3" /> Mandar a mensagem pelo WhatsApp
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </DialogContent>
  </Dialog>
);

/** Próximas visitas (e as de ontem, para marcar presença). */
const VisitasLista = () => {
  const [lista, setLista] = useState<(Visita & { lead: Pick<Lead, "nome" | "whatsapp" | "serie" | "turno"> | null })[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await tabela("visitas")
      .select("id, lead_id, inicio, status, lead:leads_site(nome, whatsapp, serie, turno)")
      .gte("inicio", new Date(Date.now() - 2 * 86400000).toISOString())
      .neq("status", "cancelada")
      .order("inicio");
    if (error) toast.error(mensagemAmigavel(error));
    setLista((data ?? []) as never);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const [paraCancelar, setParaCancelar] = useState<(typeof lista)[number] | null>(null);
  const [avisar, setAvisar] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [resultado, setResultado] = useState<Cancelada[] | null>(null);

  const marcar = async (id: string, status: Visita["status"]) => {
    const { error } = await tabela("visitas").update({ status }).eq("id", id);
    if (error) return toast.error(mensagemAmigavel(error));
    carregar();
  };

  const confirmarCancelamento = async () => {
    if (!paraCancelar) return;
    setCancelando(true);
    const r = await cancelarVisitas({ acao: "cancelar", visita_id: paraCancelar.id, avisar });
    setCancelando(false);
    setParaCancelar(null);
    if (r) setResultado(r);
    carregar();
  };

  if (carregando) return <Loader2 className="w-6 h-6 animate-spin mx-auto text-zampieri-green-dark" aria-label="Carregando" />;
  if (!lista.length) return <p className="text-center text-muted-foreground py-10">Nenhuma visita agendada.</p>;

  return (
    <ul className="divide-y rounded-xl border bg-white">
      {lista.map((v) => (
        <li key={v.id} className="p-4 flex flex-wrap items-center gap-3">
          <CalendarClock className="w-5 h-5 text-zampieri-green-dark" aria-hidden="true" />
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium">{dataHora(v.inicio)} · {v.lead?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {v.lead?.serie}
              {v.lead?.turno ? ` · ${v.lead.turno}` : ""} ·{" "}
              {v.lead && (
                <a href={`https://wa.me/55${v.lead.whatsapp}`} target="_blank" rel="noreferrer" className="underline">
                  {telefone(v.lead.whatsapp)}
                </a>
              )}
            </p>
          </div>
          <span className="text-xs font-semibold rounded-full bg-muted px-2.5 py-1">{STATUS_VISITA[v.status]}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => marcar(v.id, "realizada")} disabled={v.status === "realizada"}>Realizada</Button>
            <Button size="sm" variant="outline" onClick={() => marcar(v.id, "faltou")} disabled={v.status === "faltou"}>Faltou</Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={v.status !== "agendada"}
              onClick={() => {
                setAvisar(true);
                setParaCancelar(v);
              }}
            >
              Cancelar
            </Button>
          </div>
        </li>
      ))}
      <Dialog open={!!paraCancelar} onOpenChange={(o) => !o && setParaCancelar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar esta visita?</DialogTitle>
            <DialogDescription>
              {paraCancelar && `${paraCancelar.lead?.nome} · ${dataLonga(paraCancelar.inicio)}. O horário volta a ficar livre no site.`}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} className="mt-1" />
            <span>Avisar a família pelo WhatsApp que a visita foi cancelada e que ela precisa remarcar pelo site.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParaCancelar(null)}>Voltar</Button>
            <Button onClick={confirmarCancelamento} disabled={cancelando} className="bg-destructive hover:bg-destructive/90 text-white">
              {cancelando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Cancelar visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ResultadoCancelamento lista={resultado} aoFechar={() => setResultado(null)} />
    </ul>
  );
};

/** Dias e horários em que a escola recebe visitas, e dias bloqueados (feriados, eventos). */
const AgendaVisitas = () => {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [nova, setNova] = useState({ dia_semana: 1, hora_inicio: "08:00", hora_fim: "11:00", duracao_min: 45, capacidade: 1 });
  const [novoBloqueio, setNovoBloqueio] = useState({ data: "", motivo: "" });

  const carregar = useCallback(async () => {
    const [r, b] = await Promise.all([
      tabela("visita_agenda_regras").select("*").order("dia_semana").order("hora_inicio"),
      tabela("visita_agenda_bloqueios").select("*").gte("data", new Date().toISOString().slice(0, 10)).order("data"),
    ]);
    if (r.error || b.error) toast.error(mensagemAmigavel(r.error || b.error));
    setRegras((r.data ?? []) as unknown as Regra[]);
    setBloqueios((b.data ?? []) as unknown as Bloqueio[]);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionarRegra = async () => {
    if (nova.hora_fim <= nova.hora_inicio) return toast.error("O horário final precisa ser depois do inicial.");
    const { error } = await tabela("visita_agenda_regras").insert(nova);
    if (error) return toast.error(mensagemAmigavel(error));
    toast.success("Horário adicionado.");
    carregar();
  };

  const alternarRegra = async (r: Regra) => {
    const { error } = await tabela("visita_agenda_regras").update({ ativo: !r.ativo }).eq("id", r.id);
    if (error) return toast.error(mensagemAmigavel(error));
    carregar();
  };

  const removerRegra = async (r: Regra) => {
    if (!confirm("Remover este horário? Visitas já agendadas continuam valendo.")) return;
    const { error } = await tabela("visita_agenda_regras").delete().eq("id", r.id);
    if (error) return toast.error(mensagemAmigavel(error));
    carregar();
  };

  const [resultado, setResultado] = useState<Cancelada[] | null>(null);
  const [pendenteDia, setPendenteDia] = useState<{ data: string; total: number } | null>(null);
  const [cancelandoDia, setCancelandoDia] = useState(false);

  const adicionarBloqueio = async () => {
    if (!novoBloqueio.data) return toast.error("Escolha a data.");
    const data = novoBloqueio.data;
    const { error } = await tabela("visita_agenda_bloqueios").insert({ data, motivo: novoBloqueio.motivo || null });
    if (error) return toast.error(error.code === "23505" ? "Esta data já está bloqueada." : mensagemAmigavel(error));
    setNovoBloqueio({ data: "", motivo: "" });
    carregar();
    // Visitas já marcadas no dia bloqueado (ex.: feriado esquecido) continuam valendo até serem canceladas
    const { data: c } = await supabase.functions.invoke("admin-visitas", { body: { acao: "contar_dia", data } });
    if (c?.ok && c.total > 0) setPendenteDia({ data, total: c.total });
    else toast.success("Dia bloqueado.");
  };

  const cancelarDia = async () => {
    if (!pendenteDia) return;
    setCancelandoDia(true);
    const r = await cancelarVisitas({ acao: "cancelar_dia", data: pendenteDia.data, avisar: true });
    setCancelandoDia(false);
    setPendenteDia(null);
    if (r) setResultado(r);
  };

  const removerBloqueio = async (b: Bloqueio) => {
    const { error } = await tabela("visita_agenda_bloqueios").delete().eq("id", b.id);
    if (error) return toast.error(mensagemAmigavel(error));
    carregar();
  };

  const sel = "rounded-md border px-3 py-2 bg-white text-sm";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-lg text-zampieri-green-dark">Horários de visita</h2>
        <p className="text-sm text-muted-foreground">
          O site mostra os horários das próximas 2 semanas, com no mínimo 2 horas de antecedência. "Vagas" é quantas
          famílias podem visitar no mesmo horário.
        </p>
        {regras.length === 0 ? (
          <p className="text-sm font-semibold text-destructive">
            Nenhum horário cadastrado: o site não oferece visitas e pede para combinar pelo WhatsApp.
          </p>
        ) : (
          <ul className="divide-y">
            {regras.map((r) => (
              <li key={r.id} className={`py-2 flex items-center gap-3 text-sm ${r.ativo ? "" : "opacity-50"}`}>
                <span className="w-20 font-medium">{DIAS[r.dia_semana]}</span>
                <span className="flex-1">
                  {r.hora_inicio.slice(0, 5)}–{r.hora_fim.slice(0, 5)} · a cada {r.duracao_min} min · {r.capacidade}{" "}
                  {r.capacidade === 1 ? "vaga" : "vagas"}
                </span>
                <Button size="sm" variant="outline" onClick={() => alternarRegra(r)}>{r.ativo ? "Pausar" : "Ativar"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removerRegra(r)} aria-label="Remover horário">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div>
            <label className="block text-xs font-semibold mb-1">Dia</label>
            <select className={sel} value={nova.dia_semana} onChange={(e) => setNova({ ...nova, dia_semana: Number(e.target.value) })}>
              {DIAS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Das</label>
            <Input type="time" value={nova.hora_inicio} onChange={(e) => setNova({ ...nova, hora_inicio: e.target.value })} className="w-28" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Até</label>
            <Input type="time" value={nova.hora_fim} onChange={(e) => setNova({ ...nova, hora_fim: e.target.value })} className="w-28" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Duração</label>
            <select className={sel} value={nova.duracao_min} onChange={(e) => setNova({ ...nova, duracao_min: Number(e.target.value) })}>
              {[30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Vagas</label>
            <Input type="number" min={1} max={20} value={nova.capacidade} onChange={(e) => setNova({ ...nova, capacidade: Math.max(1, Number(e.target.value)) })} className="w-20" />
          </div>
          <Button onClick={adicionarRegra} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-lg text-zampieri-green-dark">Dias sem visita</h2>
        <p className="text-sm text-muted-foreground">Feriados, eventos ou dias em que a secretaria não pode receber famílias.</p>
        {bloqueios.length > 0 && (
          <ul className="divide-y">
            {bloqueios.map((b) => (
              <li key={b.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-medium">{b.data.split("-").reverse().join("/")}</span>
                <span className="flex-1 text-muted-foreground">{b.motivo}</span>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removerBloqueio(b)} aria-label="Remover bloqueio">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div>
            <label className="block text-xs font-semibold mb-1">Data</label>
            <Input type="date" value={novoBloqueio.data} onChange={(e) => setNovoBloqueio({ ...novoBloqueio, data: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold mb-1">Motivo (opcional)</label>
            <Input value={novoBloqueio.motivo} onChange={(e) => setNovoBloqueio({ ...novoBloqueio, motivo: e.target.value })} placeholder="Feriado" />
          </div>
          <Button onClick={adicionarBloqueio} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Bloquear
          </Button>
        </div>
      </section>
      <Dialog open={!!pendenteDia} onOpenChange={(o) => !o && setPendenteDia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendenteDia?.total === 1 ? "Há 1 visita marcada nesse dia" : `Há ${pendenteDia?.total} visitas marcadas nesse dia`}
            </DialogTitle>
            <DialogDescription>
              O dia {pendenteDia?.data.split("-").reverse().join("/")} foi bloqueado para novas visitas, mas quem já marcou
              continua agendado. Quer cancelar essas visitas e avisar as famílias pelo WhatsApp para remarcarem?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendenteDia(null)}>Manter as visitas</Button>
            <Button onClick={cancelarDia} disabled={cancelandoDia} className="bg-destructive hover:bg-destructive/90 text-white">
              {cancelandoDia && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Cancelar e avisar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ResultadoCancelamento lista={resultado} aoFechar={() => setResultado(null)} />
    </div>
  );
};

export default LeadsSiteAdmin;
