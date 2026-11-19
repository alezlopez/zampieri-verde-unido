import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COMO_CONHECEU } from "@/components/prematricula/types";
import { canal, ehAnuncio } from "@/lib/canalLead";
import { mensagemAmigavel } from "@/lib/mensagensErro";

/** Uma família (telefone) com a etapa calculada no banco (função funil_familias). */
interface Familia {
  chave: string;
  telefone: string | null;
  responsavel: string | null;
  alunos: string | null;
  serie: string | null;
  turno: string | null;
  primeiro_contato: string;
  entrada: "visita" | "whatsapp" | "formulario" | "pre_direta";
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tem_fbclid: boolean;
  tem_gclid: boolean;
  como_conheceu: string | null;
  etapa: Etapa;
  etapa_ordem: number;
  motivo_perda: string | null;
  perda_manual: boolean;
  lista_espera: boolean;
  visita_inicio: string | null;
  visita_status: string | null;
  protocolos: string | null;
  lead_ids: string[];
  tem_pre: boolean;
}

type Etapa =
  | "interessado"
  | "visita_agendada"
  | "visita_faltou"
  | "visita_realizada"
  | "pre_matricula"
  | "aprovada"
  | "documentos"
  | "contrato"
  | "matriculado"
  | "perdido";

const ETAPAS: { id: Etapa; rotulo: string; cor: string }[] = [
  { id: "interessado", rotulo: "Interessado", cor: "bg-zampieri-cream text-zampieri-green-dark" },
  { id: "visita_agendada", rotulo: "Visita agendada", cor: "bg-zampieri-cream text-zampieri-green-dark" },
  { id: "visita_faltou", rotulo: "Faltou à visita", cor: "bg-amber-100 text-amber-900" },
  { id: "visita_realizada", rotulo: "Visita realizada", cor: "bg-zampieri-cream text-zampieri-green-dark" },
  { id: "pre_matricula", rotulo: "Pré-matrícula enviada", cor: "bg-zampieri-green-dark/10 text-zampieri-green-dark" },
  { id: "aprovada", rotulo: "Aprovada / entrevista", cor: "bg-zampieri-green-dark/10 text-zampieri-green-dark" },
  { id: "documentos", rotulo: "Documentos", cor: "bg-zampieri-green-dark/15 text-zampieri-green-dark" },
  { id: "contrato", rotulo: "Contrato", cor: "bg-zampieri-green-dark/20 text-zampieri-green-dark" },
  { id: "matriculado", rotulo: "Matriculado", cor: "bg-zampieri-green-dark text-white" },
  { id: "perdido", rotulo: "Perdido", cor: "bg-red-50 text-red-800" },
];
const ROTULO_ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e.rotulo])) as Record<Etapa, string>;
const COR_ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e.cor])) as Record<Etapa, string>;

const ENTRADAS: Record<Familia["entrada"], string> = {
  visita: "Site · agendar visita",
  whatsapp: "Site · botão WhatsApp",
  formulario: "Site · quero saber o desconto",
  pre_direta: "Direto na pré-matrícula",
};
const ROTULO_COMO = Object.fromEntries(COMO_CONHECEU) as Record<string, string>;

const PERIODOS = [
  { v: "30", t: "30 dias" },
  { v: "90", t: "90 dias" },
  { v: "180", t: "6 meses" },
  { v: "tudo", t: "Tudo" },
];

const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const telefoneFmt = (d: string | null) => {
  const n = String(d || "").replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
};
const canalDa = (f: Familia) =>
  canal({ utm_source: f.utm_source, utm_medium: f.utm_medium, fbclid: f.tem_fbclid ? "1" : null, gclid: f.tem_gclid ? "1" : null });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const passouVisita = (f: Familia) => !!f.visita_status && f.visita_status !== "cancelada";

export const FunilFamilias = () => {
  const [periodo, setPeriodo] = useState("90");
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState<"" | Etapa | "ativos">("");
  const [origem, setOrigem] = useState<"" | "anuncio" | "nao_anuncio">("");
  const [busca, setBusca] = useState("");
  const [perder, setPerder] = useState<Familia | null>(null);
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const desde = periodo === "tudo" ? null : new Date(Date.now() - Number(periodo) * 86400000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("funil_familias" as any, { p_desde: desde });
    if (error) toast.error(mensagemAmigavel(error));
    setFamilias((data ?? []) as unknown as Familia[]);
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Recorte por origem e busca (a contagem por etapa respeita esse recorte)
  const recorte = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    return familias.filter((f) => {
      if (origem === "anuncio" && !ehAnuncio(canalLike(f))) return false;
      if (origem === "nao_anuncio" && ehAnuncio(canalLike(f))) return false;
      if (!termo) return true;
      return (
        (f.responsavel || "").toLowerCase().includes(termo) ||
        (f.alunos || "").toLowerCase().includes(termo) ||
        (f.protocolos || "").toLowerCase().includes(termo) ||
        (digitos.length >= 4 && (f.telefone || "").includes(digitos))
      );
    });
  }, [familias, origem, busca]);

  const lista = recorte.filter((f) =>
    !etapa ? true : etapa === "ativos" ? f.etapa !== "perdido" && f.etapa !== "matriculado" : f.etapa === etapa,
  );

  const totais = useMemo(() => {
    const t = { familias: recorte.length, visita: 0, pre: 0, matriculado: 0, perdido: 0 };
    for (const f of recorte) {
      if (passouVisita(f)) t.visita++;
      if (f.tem_pre) t.pre++;
      if (f.etapa === "matriculado") t.matriculado++;
      if (f.etapa === "perdido") t.perdido++;
    }
    return t;
  }, [recorte]);

  const porEtapa = useMemo(() => {
    const m = new Map<Etapa, number>();
    for (const f of recorte) m.set(f.etapa, (m.get(f.etapa) ?? 0) + 1);
    return m;
  }, [recorte]);

  const porCampanha = useMemo(() => {
    const m = new Map<string, { canal: string; campanha: string; familias: number; visita: number; pre: number; matriculado: number }>();
    for (const f of recorte) {
      const c = canalDa(f);
      const campanha = f.utm_campaign || "—";
      const k = `${c}|${campanha}`;
      const item = m.get(k) ?? { canal: c, campanha, familias: 0, visita: 0, pre: 0, matriculado: 0 };
      item.familias++;
      if (passouVisita(f)) item.visita++;
      if (f.tem_pre) item.pre++;
      if (f.etapa === "matriculado") item.matriculado++;
      m.set(k, item);
    }
    return [...m.values()].sort((a, b) => b.familias - a.familias);
  }, [recorte]);

  const porComoConheceu = useMemo(() => {
    const m = new Map<string, { familias: number; matriculado: number }>();
    for (const f of recorte) {
      if (!f.como_conheceu) continue;
      const item = m.get(f.como_conheceu) ?? { familias: 0, matriculado: 0 };
      item.familias++;
      if (f.etapa === "matriculado") item.matriculado++;
      m.set(f.como_conheceu, item);
    }
    return [...m.entries()].sort((a, b) => b[1].familias - a[1].familias);
  }, [recorte]);

  const marcarPerdido = async () => {
    if (!perder) return;
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("leads_site" as any)
      .update({ status: "perdido", observacao: motivo.trim() || null })
      .in("id", perder.lead_ids);
    if (error) return toast.error(mensagemAmigavel(error));
    setPerder(null);
    setMotivo("");
    carregar();
  };

  const reativar = async (f: Familia) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("leads_site" as any).update({ status: "novo" }).in("id", f.lead_ids);
    if (error) return toast.error(mensagemAmigavel(error));
    carregar();
  };

  const exportar = () => {
    const cab = [
      "primeiro_contato", "responsavel", "alunos", "telefone", "serie", "turno", "entrada", "canal",
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "como_conheceu",
      "etapa", "lista_espera", "visita", "status_visita", "protocolos", "motivo_perda",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = lista.map((f) =>
      [
        dataHora(f.primeiro_contato), f.responsavel, f.alunos, f.telefone, f.serie, f.turno, ENTRADAS[f.entrada], canalDa(f),
        f.utm_source, f.utm_medium, f.utm_campaign, f.utm_content, f.utm_term, f.como_conheceu ? ROTULO_COMO[f.como_conheceu] : "",
        ROTULO_ETAPA[f.etapa], f.lista_espera ? "sim" : "", f.visita_inicio ? dataHora(f.visita_inicio) : "", f.visita_status,
        f.protocolos, f.motivo_perda,
      ].map(esc).join(";"),
    );
    const blob = new Blob(["﻿" + [cab.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `funil-familias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="funil-periodo">Primeiro contato</label>
          <select id="funil-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="rounded-md border px-3 py-2 bg-white text-sm">
            {PERIODOS.map((p) => (
              <option key={p.v} value={p.v}>{p.t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" htmlFor="funil-origem">Origem</label>
          <select id="funil-origem" value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)} className="rounded-md border px-3 py-2 bg-white text-sm">
            <option value="">Todas</option>
            <option value="anuncio">Só anúncios</option>
            <option value="nao_anuncio">Sem anúncio (orgânico, WhatsApp, direto)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold mb-1" htmlFor="funil-busca">Buscar</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="funil-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, aluno, telefone ou protocolo" className="pl-9" />
          </div>
        </div>
        <Button variant="outline" onClick={exportar} disabled={!lista.length}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Funil resumido */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Famílias", totais.familias, ""],
          ["Fizeram visita", totais.visita, pct(totais.visita, totais.familias)],
          ["Pré-matrícula", totais.pre, pct(totais.pre, totais.familias)],
          ["Matriculadas", totais.matriculado, pct(totais.matriculado, totais.familias)],
          ["Perdidas", totais.perdido, pct(totais.perdido, totais.familias)],
        ].map(([t, n, p]) => (
          <div key={t as string} className="rounded-xl bg-white border p-4">
            <p className="text-xs text-muted-foreground">{t}</p>
            <p className="text-2xl font-bold text-zampieri-green-dark">
              {n} {p && <span className="text-sm font-normal text-muted-foreground">{p}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Etapas: clique para filtrar */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por etapa">
        {[{ id: "" as const, rotulo: "Todas", n: recorte.length }, { id: "ativos" as const, rotulo: "Em andamento", n: recorte.filter((f) => f.etapa !== "perdido" && f.etapa !== "matriculado").length }, ...ETAPAS.map((e) => ({ id: e.id, rotulo: e.rotulo, n: porEtapa.get(e.id) ?? 0 }))].map((e) => (
          <button
            key={e.id || "todas"}
            type="button"
            onClick={() => setEtapa(e.id)}
            aria-pressed={etapa === e.id}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              etapa === e.id ? "bg-zampieri-green-dark text-white border-zampieri-green-dark" : "bg-white hover:border-zampieri-green-dark"
            }`}
          >
            {e.rotulo} · {e.n}
          </button>
        ))}
      </div>

      {/* Por campanha: o que mede os anúncios */}
      {porCampanha.length > 0 && (
        <div className="rounded-xl bg-white border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Campanha</th>
                <th className="px-3 py-2 text-right">Famílias</th>
                <th className="px-3 py-2 text-right">Visita</th>
                <th className="px-3 py-2 text-right">Pré-matrícula</th>
                <th className="px-3 py-2 text-right">Matriculadas</th>
              </tr>
            </thead>
            <tbody>
              {porCampanha.map((r) => (
                <tr key={`${r.canal}|${r.campanha}`} className="border-t">
                  <td className="px-3 py-2">{r.canal}</td>
                  <td className="px-3 py-2">{r.campanha}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.familias}</td>
                  <td className="px-3 py-2 text-right">{r.visita}</td>
                  <td className="px-3 py-2 text-right">{r.pre}</td>
                  <td className="px-3 py-2 text-right font-semibold text-zampieri-green-dark">
                    {r.matriculado} <span className="font-normal text-muted-foreground text-xs">{pct(r.matriculado, r.familias)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {porComoConheceu.length > 0 && (
        <div className="rounded-xl bg-white border p-4">
          <p className="text-sm font-semibold text-zampieri-green-dark mb-2">Como conheceram a escola (resposta na pré-matrícula)</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {porComoConheceu.map(([k, v]) => (
              <span key={k} className="rounded-full bg-zampieri-cream px-3 py-1">
                {ROTULO_COMO[k] ?? k}: <strong>{v.familias}</strong>
                {v.matriculado > 0 && ` · ${v.matriculado} matriculada(s)`}
              </span>
            ))}
          </div>
        </div>
      )}

      {carregando ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-zampieri-green-dark" aria-label="Carregando" />
      ) : lista.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nenhuma família neste recorte.</p>
      ) : (
        <div className="rounded-xl bg-white border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Primeiro contato</th>
                <th className="px-3 py-2">Família</th>
                <th className="px-3 py-2">Série</th>
                <th className="px-3 py-2">Veio de</th>
                <th className="px-3 py-2">Etapa</th>
                <th className="px-3 py-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.chave} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {dataCurta(f.primeiro_contato)}
                    <span className="block text-[11px] text-muted-foreground">{ENTRADAS[f.entrada]}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{f.responsavel || "—"}</span>
                    {f.alunos && <span className="block text-xs text-muted-foreground">Aluno(s): {f.alunos}</span>}
                    {f.telefone && (
                      <a
                        href={`https://wa.me/55${String(f.telefone).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-fit items-center gap-1 text-xs text-zampieri-green-dark underline"
                      >
                        <MessageCircle className="w-3 h-3" /> {telefoneFmt(f.telefone)}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {f.serie || "—"}
                    {f.turno && <span className="block text-xs text-muted-foreground">{f.turno}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={ehAnuncio(canalLike(f)) ? "font-semibold text-zampieri-green-dark" : ""}>{canalDa(f)}</span>
                    {(f.utm_campaign || f.utm_content) && (
                      <span className="block text-xs text-muted-foreground">{[f.utm_campaign, f.utm_content].filter(Boolean).join(" · ")}</span>
                    )}
                    {f.como_conheceu && (
                      <span className="block text-xs text-muted-foreground">Disse: {ROTULO_COMO[f.como_conheceu] ?? f.como_conheceu}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${COR_ETAPA[f.etapa]}`}>{ROTULO_ETAPA[f.etapa]}</span>
                    {f.lista_espera && <span className="ml-1 inline-block rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-semibold">lista de espera</span>}
                    {f.visita_inicio && passouVisita(f) && (
                      <span className="block text-xs text-muted-foreground mt-1">Visita: {dataHora(f.visita_inicio)}</span>
                    )}
                    {f.protocolos && <span className="block text-xs text-muted-foreground">Protocolo: {f.protocolos}</span>}
                    {f.etapa === "perdido" && f.motivo_perda && <span className="block text-xs text-red-800">Motivo: {f.motivo_perda}</span>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {!f.tem_pre && f.lead_ids.length > 0 &&
                      (f.perda_manual ? (
                        <Button size="sm" variant="ghost" onClick={() => reativar(f)}>Reativar</Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setMotivo(""); setPerder(f); }}>
                          Marcar perdido
                        </Button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!perder} onOpenChange={(o) => !o && setPerder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido?</DialogTitle>
            <DialogDescription>
              {perder?.responsavel}. Use quando a família desistiu antes da pré-matrícula. Se ela fizer a pré-matrícula depois, a etapa
              volta a ser calculada sozinha.
            </DialogDescription>
          </DialogHeader>
          <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional): preço, distância, escolheu outra escola..." maxLength={200} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPerder(null)}>Voltar</Button>
            <Button onClick={marcarPerdido} className="bg-destructive hover:bg-destructive/90 text-white">Marcar perdido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Formato aceito por canal()/ehAnuncio() a partir da linha do funil. */
const canalLike = (f: Familia) => ({ utm_source: f.utm_source, utm_medium: f.utm_medium, fbclid: f.tem_fbclid ? "1" : null, gclid: f.tem_gclid ? "1" : null });
