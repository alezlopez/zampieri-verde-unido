import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Download, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mensagemAmigavel } from "@/lib/mensagensErro";

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
const ORIGENS: Record<Lead["origem"], string> = { visita: "Agendar visita", whatsapp: "WhatsApp", formulario: "Quero saber o desconto" };
const STATUS: Record<Lead["status"], string> = { novo: "Novo", em_contato: "Em contato", convertido: "Matriculou", perdido: "Perdido" };
const STATUS_VISITA: Record<Visita["status"], string> = { agendada: "Agendada", realizada: "Realizada", faltou: "Faltou", cancelada: "Cancelada" };

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const telefone = (d: string) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`);

/** De onde veio: anúncio do Meta (fbclid/_fbc ou utm), do Google (gclid ou utm) ou orgânico. */
const canal = (l: Pick<Lead, "fbclid" | "fbc" | "gclid" | "utm_source" | "utm_medium">) => {
  const fonte = (l.utm_source || "").toLowerCase();
  if (l.fbclid || l.fbc || /^(fb|facebook|ig|instagram|meta)/.test(fonte)) return "Anúncio Meta";
  if (l.gclid || /google/.test(fonte)) return "Anúncio Google";
  if (fonte) return `Campanha (${l.utm_source})`;
  return "Orgânico / direto";
};
const ehAnuncio = (l: Lead) => canal(l).startsWith("Anúncio");

const PERIODOS = [
  { v: "7", t: "7 dias" },
  { v: "30", t: "30 dias" },
  { v: "90", t: "90 dias" },
  { v: "tudo", t: "Tudo" },
];

const LeadsSiteAdmin = () => {
  const [periodo, setPeriodo] = useState("30");
  const [origem, setOrigem] = useState<"" | Lead["origem"]>("");
  const [soAnuncios, setSoAnuncios] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [prematriculas, setPrematriculas] = useState<Map<string, string>>(new Map());
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    let q = tabela("leads_site").select("*").order("created_at", { ascending: false }).limit(2000);
    if (periodo !== "tudo") q = q.gte("created_at", new Date(Date.now() - Number(periodo) * 86400000).toISOString());
    const { data, error } = await q;
    if (error) {
      toast.error(mensagemAmigavel(error));
      setCarregando(false);
      return;
    }
    const lista = (data ?? []) as unknown as Lead[];
    setLeads(lista);

    const ids = lista.map((l) => l.id);
    const fones = [...new Set(lista.map((l) => l.whatsapp))];
    const [vis, pms] = await Promise.all([
      ids.length ? tabela("visitas").select("id, lead_id, inicio, status").in("lead_id", ids.slice(0, 1000)).order("inicio") : Promise.resolve({ data: [] }),
      fones.length
        ? supabase.from("prematriculas").select("protocolo, resp_whatsapp").in("resp_whatsapp", fones.slice(0, 1000))
        : Promise.resolve({ data: [] }),
    ]);
    setVisitas(((vis as { data: unknown }).data ?? []) as Visita[]);
    const mapa = new Map<string, string>();
    for (const p of ((pms as { data: unknown }).data ?? []) as { protocolo: string; resp_whatsapp: string }[]) {
      mapa.set(String(p.resp_whatsapp).replace(/\D/g, ""), p.protocolo);
    }
    setPrematriculas(mapa);
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visitaDoLead = useMemo(() => {
    const m = new Map<string, Visita>();
    for (const v of visitas) if (v.status !== "cancelada" || !m.has(v.lead_id)) m.set(v.lead_id, v);
    return m;
  }, [visitas]);

  const filtrados = leads.filter((l) => (!origem || l.origem === origem) && (!soAnuncios || ehAnuncio(l)));

  const resumoCampanhas = useMemo(() => {
    const m = new Map<string, { canal: string; campanha: string; leads: number; visitas: number; pre: number }>();
    for (const l of filtrados) {
      const c = canal(l);
      const campanha = l.utm_campaign || "(sem campanha)";
      const k = `${c}|${campanha}`;
      const item = m.get(k) ?? { canal: c, campanha, leads: 0, visitas: 0, pre: 0 };
      item.leads++;
      if (visitaDoLead.get(l.id)?.status && visitaDoLead.get(l.id)!.status !== "cancelada") item.visitas++;
      if (prematriculas.has(l.whatsapp)) item.pre++;
      m.set(k, item);
    }
    return [...m.values()].sort((a, b) => b.leads - a.leads);
  }, [filtrados, visitaDoLead, prematriculas]);

  const mudarStatus = async (l: Lead, status: Lead["status"]) => {
    const { error } = await tabela("leads_site").update({ status }).eq("id", l.id);
    if (error) return toast.error(mensagemAmigavel(error));
    setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, status } : x)));
  };

  const exportar = () => {
    const cab = ["data", "nome", "whatsapp", "serie", "turno", "origem", "canal", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "visita", "status_visita", "pre_matricula", "status", "ref"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtrados.map((l) => {
      const v = visitaDoLead.get(l.id);
      return [dataHora(l.created_at), l.nome, l.whatsapp, l.serie, l.turno, ORIGENS[l.origem], canal(l), l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content, l.utm_term, v ? dataHora(v.inicio) : "", v ? STATUS_VISITA[v.status] : "", prematriculas.get(l.whatsapp) ?? "", STATUS[l.status], l.ref].map(esc).join(";");
    });
    const blob = new Blob(["﻿" + [cab.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-site-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const anuncios = filtrados.filter(ehAnuncio).length;

  return (
    <div className="min-h-screen bg-zampieri-cream/40">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="font-serif text-3xl font-bold text-zampieri-green-dark">Leads do site</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Contatos da página de matrículas (/informativomatricula): agendar visita, WhatsApp e "quero saber o desconto".
        </p>

        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="visitas">Visitas</TabsTrigger>
            <TabsTrigger value="agenda">Agenda de visitas</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-5 mt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Período</label>
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="rounded-md border px-3 py-2 bg-white text-sm">
                  {PERIODOS.map((p) => (
                    <option key={p.v} value={p.v}>{p.t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Origem</label>
                <select value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)} className="rounded-md border px-3 py-2 bg-white text-sm">
                  <option value="">Todas</option>
                  {Object.entries(ORIGENS).map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm pb-2 cursor-pointer">
                <input type="checkbox" checked={soAnuncios} onChange={(e) => setSoAnuncios(e.target.checked)} />
                Só quem veio de anúncio
              </label>
              <Button variant="outline" onClick={exportar} disabled={!filtrados.length} className="ml-auto">
                <Download className="w-4 h-4 mr-1" /> Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Leads", filtrados.length],
                ["Vieram de anúncio", anuncios],
                ["Visitas agendadas", filtrados.filter((l) => { const v = visitaDoLead.get(l.id); return v && v.status !== "cancelada"; }).length],
                ["Fizeram pré-matrícula", filtrados.filter((l) => prematriculas.has(l.whatsapp)).length],
              ].map(([t, n]) => (
                <div key={t as string} className="rounded-xl bg-white border p-4">
                  <p className="text-xs text-muted-foreground">{t}</p>
                  <p className="text-2xl font-bold text-zampieri-green-dark">{n}</p>
                </div>
              ))}
            </div>

            {resumoCampanhas.length > 0 && (
              <div className="rounded-xl bg-white border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Canal</th>
                      <th className="px-3 py-2">Campanha (utm_campaign)</th>
                      <th className="px-3 py-2 text-right">Leads</th>
                      <th className="px-3 py-2 text-right">Visitas</th>
                      <th className="px-3 py-2 text-right">Pré-matrícula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoCampanhas.map((r) => (
                      <tr key={`${r.canal}|${r.campanha}`} className="border-t">
                        <td className="px-3 py-2">{r.canal}</td>
                        <td className="px-3 py-2">{r.campanha}</td>
                        <td className="px-3 py-2 text-right font-semibold">{r.leads}</td>
                        <td className="px-3 py-2 text-right">{r.visitas}</td>
                        <td className="px-3 py-2 text-right">{r.pre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {carregando ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-zampieri-green-dark" aria-label="Carregando" />
            ) : filtrados.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum lead no período.</p>
            ) : (
              <div className="rounded-xl bg-white border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Quando</th>
                      <th className="px-3 py-2">Responsável</th>
                      <th className="px-3 py-2">Série</th>
                      <th className="px-3 py-2">Origem</th>
                      <th className="px-3 py-2">Veio de</th>
                      <th className="px-3 py-2">Visita</th>
                      <th className="px-3 py-2">Pré-matrícula</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((l) => {
                      const v = visitaDoLead.get(l.id);
                      return (
                        <tr key={l.id} className="border-t align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{dataHora(l.created_at)}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium">{l.nome}</span>
                            <a
                              href={`https://wa.me/55${l.whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-zampieri-green-dark underline"
                            >
                              <MessageCircle className="w-3 h-3" /> {telefone(l.whatsapp)}
                            </a>
                            <span className="text-[11px] text-muted-foreground">ref {l.ref}</span>
                          </td>
                          <td className="px-3 py-2">
                            {l.serie}
                            {l.turno && <span className="block text-xs text-muted-foreground">{l.turno}</span>}
                          </td>
                          <td className="px-3 py-2">{ORIGENS[l.origem]}</td>
                          <td className="px-3 py-2">
                            <span className={ehAnuncio(l) ? "font-semibold text-zampieri-green-dark" : ""}>{canal(l)}</span>
                            {(l.utm_campaign || l.utm_content) && (
                              <span className="block text-xs text-muted-foreground">
                                {[l.utm_campaign, l.utm_content].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {v ? (
                              <>
                                {dataHora(v.inicio)}
                                <span className="block text-xs text-muted-foreground">{STATUS_VISITA[v.status]}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2">{prematriculas.get(l.whatsapp) ?? "—"}</td>
                          <td className="px-3 py-2">
                            <select
                              value={l.status}
                              onChange={(e) => mudarStatus(l, e.target.value as Lead["status"])}
                              className="rounded border px-2 py-1 bg-white text-xs"
                              aria-label={`Status de ${l.nome}`}
                            >
                              {Object.entries(STATUS).map(([k, t]) => (
                                <option key={k} value={k}>{t}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
};

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

  const marcar = async (id: string, status: Visita["status"]) => {
    if (status === "cancelada" && !confirm("Cancelar esta visita? O horário volta a ficar livre no site.")) return;
    const { error } = await tabela("visitas").update({ status }).eq("id", id);
    if (error) return toast.error(mensagemAmigavel(error));
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
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => marcar(v.id, "cancelada")}>Cancelar</Button>
          </div>
        </li>
      ))}
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

  const adicionarBloqueio = async () => {
    if (!novoBloqueio.data) return toast.error("Escolha a data.");
    const { error } = await tabela("visita_agenda_bloqueios").insert({ data: novoBloqueio.data, motivo: novoBloqueio.motivo || null });
    if (error) return toast.error(error.code === "23505" ? "Esta data já está bloqueada." : mensagemAmigavel(error));
    setNovoBloqueio({ data: "", motivo: "" });
    carregar();
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
    </div>
  );
};

export default LeadsSiteAdmin;
