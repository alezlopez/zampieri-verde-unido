import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, RefreshCw, Wand2, Pencil, Ban } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { TaxaManualDialog } from "@/components/TaxaManualDialog";
import { CancelarIngressoDialog } from "@/components/CancelarIngressoDialog";

type Linha = {
  id: string;
  evento_id: string;
  evento_titulo: string;
  evento_data: string | null;
  status: string;
  forma_pagamento: string | null;
  parcelas: number | null;
  nome_comprador: string | null;
  nome_participante: string | null;
  tipo_participante: string | null;
  tipo_ingresso: string | null;
  cortesia: boolean;
  codigo_aluno: string | null;
  data_pagamento: string | null;
  data_credito: string | null;
  valor_bruto: number;
  valor_liquido: number | null;
  taxa_total: number | null;
  taxa_manual: number | null;
  liquido_pendente_calculo: boolean;
  utilizado: boolean;
  utilizado_em: string | null;
  utilizado_por_nome: string | null;
  meia_validada_portaria: boolean;
  meia_validada_em: string | null;
  meia_validada_por_nome: string | null;
};

type Resposta = {
  lista: Linha[];
  totais: {
    bruto: number; liquido: number; taxa: number;
    qtd: number; qtd_cortesias: number;
    qtd_liquido_pendente?: number;
    bruto_liquido_pendente?: number;
    qtd_utilizados: number; qtd_pagos: number;
    ticket_medio: number; percentual_taxa: number;
  };
  por_evento: { evento_id: string; evento_titulo: string; bruto: number; liquido: number; taxa: number; qtd: number; pendentes?: number }[];
  por_forma: { forma: string; bruto: number; liquido: number; taxa: number; qtd: number; pendentes?: number }[];
};

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
};

const formaLabel = (f: string) => {
  switch (f) {
    case "pix": return "PIX";
    case "credit_card": return "Cartão à vista";
    case "credit_card_parcelado": return "Cartão parcelado";
    default: return f || "—";
  }
};

const EventosRelatorio = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [eventos, setEventos] = useState<{ id: string; titulo: string }[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [eventoId, setEventoId] = useState<string>("todos");
  const [formaPagamento, setFormaPagamento] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [incluirCortesias, setIncluirCortesias] = useState(true);
  const [filtroUso, setFiltroUso] = useState<"todos" | "utilizados" | "nao_utilizados">("todos");
  const [data, setData] = useState<Resposta | null>(null);
  const [editTaxa, setEditTaxa] = useState<Linha | null>(null);
  const [cancelar, setCancelar] = useState<Linha | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/eventos");
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    supabase.from("eventos").select("id, titulo").order("data_evento", { ascending: false }).then(({ data }) => {
      setEventos(data || []);
    });
  }, []);

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const body: any = {
        status: statusFiltro,
        incluir_cortesias: incluirCortesias,
      };
      if (eventoId && eventoId !== "todos") body.evento_id = eventoId;
      if (formaPagamento && formaPagamento !== "todos") body.forma_pagamento = formaPagamento;
      if (dataInicio) body.data_inicio = new Date(dataInicio + "T00:00:00").toISOString();
      if (dataFim) body.data_fim = new Date(dataFim + "T23:59:59").toISOString();
      const { data: resp, error } = await supabase.functions.invoke("relatorio-vendas", { body });
      if (error) throw error;
      setData(resp as Resposta);
    } catch (e: any) {
      toast({ title: "Erro ao carregar relatório", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) fetchRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const sincronizarLiquidos = async (force = false) => {
    if (force && !confirm("Recalcular líquido de TODOS os ingressos pagos (inclusive os já preenchidos)? Isso aplica as taxas de antecipação atualizadas.")) return;
    setBackfillLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("backfill-financeiro", { body: { force } });
      if (error) throw error;
      toast({
        title: "Sincronização concluída",
        description: `Total: ${resp.total} · Processados: ${resp.processados} · Erros: ${resp.erros}`,
      });
      fetchRelatorio();
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message || String(e), variant: "destructive" });
    } finally {
      setBackfillLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!data) return;
    const header = [
      "Evento","Data Evento","Comprador","Participante","Tipo","Forma","Parcelas",
      "Status","Data Pagamento","Data Crédito","Valor Bruto","Valor Líquido","Taxa","Cortesia","Código Aluno",
      "Utilizado","Utilizado em","Validado por","Meia validada","Meia validada em","Meia validada por",
    ];
    const rows = data.lista.map((r) => [
      r.evento_titulo, r.evento_data || "",
      r.nome_comprador || "", r.nome_participante || "",
      r.tipo_ingresso || "", formaLabel(r.forma_pagamento || ""),
      r.parcelas ?? 1, r.status,
      r.data_pagamento || "", r.data_credito || "",
      r.valor_bruto.toFixed(2),
      r.valor_liquido !== null ? r.valor_liquido.toFixed(2) : "",
      r.taxa_total !== null ? r.taxa_total.toFixed(2) : "",
      r.cortesia ? "Sim" : "Não", r.codigo_aluno || "",
      r.utilizado ? "Sim" : "Não", r.utilizado_em || "", r.utilizado_por_nome || "",
      r.meia_validada_portaria ? "Sim" : "Não", r.meia_validada_em || "", r.meia_validada_por_nome || "",
    ]);
    rows.push([]);
    rows.push(["TOTAIS","","","","","","","","","",
      data.totais.bruto.toFixed(2), data.totais.liquido.toFixed(2), data.totais.taxa.toFixed(2), "", "", "", "", "", "", "", ""]);
    const csv = [header, ...rows].map((r) =>
      r.map((c) => {
        const s = String(c ?? "");
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(";"),
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendentesCalculo = useMemo(
    () => (data?.lista || []).filter((r) => r.liquido_pendente_calculo).length,
    [data],
  );

  const listaFiltrada = useMemo(() => {
    const base = data?.lista || [];
    if (filtroUso === "utilizados") return base.filter((r) => r.utilizado);
    if (filtroUso === "nao_utilizados") return base.filter((r) => !r.utilizado);
    return base;
  }, [data, filtroUso]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Relatório Financeiro" />
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <Link to="/eventos/admin" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Painel
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => sincronizarLiquidos(false)}
                disabled={backfillLoading}
                className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream"
              >
                <Wand2 className={`w-4 h-4 mr-2 ${backfillLoading ? "animate-spin" : ""}`} />
                Sincronizar líquidos
              </Button>
              <Button
                variant="outline"
                onClick={() => sincronizarLiquidos(true)}
                disabled={backfillLoading}
                className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream"
              >
                <Wand2 className={`w-4 h-4 mr-2 ${backfillLoading ? "animate-spin" : ""}`} />
                Forçar recálculo
              </Button>
              <Button onClick={exportarCSV} disabled={!data} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-zampieri-green-dark mb-4">Relatório Financeiro</h1>

          {/* Filtros */}
          <Card className="mb-4 border-border">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">Data início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Data fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Evento</Label>
                <Select value={eventoId} onValueChange={setEventoId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {eventos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Forma</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="estornado">Estornados</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Uso</Label>
                <Select value={filtroUso} onValueChange={(v) => setFiltroUso(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="utilizados">Utilizados</SelectItem>
                    <SelectItem value="nao_utilizados">Não utilizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 mr-2">
                  <Checkbox id="cortesias" checked={incluirCortesias} onCheckedChange={(v) => setIncluirCortesias(!!v)} />
                  <Label htmlFor="cortesias" className="text-xs">Incluir cortesias</Label>
                </div>
                <Button onClick={fetchRelatorio} disabled={loading} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Bruto</p>
                  <p className="text-xl font-bold text-zampieri-green-dark">{formatBRL(data.totais.bruto)}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Líquido</p>
                  <p className="text-xl font-bold text-zampieri-green-dark">{formatBRL(data.totais.liquido)}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Taxas</p>
                  <p className="text-xl font-bold text-zampieri-wine">{formatBRL(data.totais.taxa)}</p>
                  <p className="text-[10px] text-muted-foreground">{data.totais.percentual_taxa}% do bruto</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Ingressos</p>
                  <p className="text-xl font-bold">{data.totais.qtd}</p>
                  <p className="text-[10px] text-muted-foreground">{data.totais.qtd_cortesias} cortesia(s)</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Utilizados</p>
                  <p className="text-xl font-bold text-zampieri-green-dark">{data.totais.qtd_utilizados ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {data.totais.qtd_pagos > 0
                      ? `${Math.round(((data.totais.qtd_utilizados ?? 0) / data.totais.qtd_pagos) * 100)}% dos pagos`
                      : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                  <p className="text-xl font-bold">{formatBRL(data.totais.ticket_medio)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {pendentesCalculo > 0 && (
            <p className="text-xs text-zampieri-wine mb-3">
              {pendentesCalculo} ingresso(s) pago(s) ainda sem valor líquido. Clique em "Sincronizar líquidos" para buscar do Asaas.
            </p>
          )}

          {/* Quebras */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-zampieri-green-dark">Por evento</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.por_evento.map((e) => (
                        <TableRow key={e.evento_id}>
                          <TableCell className="text-xs">{e.evento_titulo}</TableCell>
                          <TableCell className="text-right text-xs">{e.qtd}</TableCell>
                          <TableCell className="text-right text-xs">{formatBRL(e.bruto)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">{formatBRL(e.liquido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-zampieri-green-dark">Por forma de pagamento</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.por_forma.map((f) => (
                        <TableRow key={f.forma}>
                          <TableCell className="text-xs">{formaLabel(f.forma)}</TableCell>
                          <TableCell className="text-right text-xs">{f.qtd}</TableCell>
                          <TableCell className="text-right text-xs">{formatBRL(f.bruto)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">{formatBRL(f.liquido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detalhada */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zampieri-green-dark">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead>Utilização</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.evento_titulo}</TableCell>
                      <TableCell className="text-xs">{r.nome_comprador}</TableCell>
                      <TableCell className="text-xs">
                        {r.nome_participante}
                        {r.cortesia && <Badge variant="secondary" className="ml-2 text-[10px]">Cortesia</Badge>}
                        {r.tipo_ingresso === "meia" && <Badge variant="outline" className="ml-2 text-[10px]">Meia</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formaLabel(
                          r.forma_pagamento === "credit_card" && (r.parcelas || 1) > 1
                            ? "credit_card_parcelado" : (r.forma_pagamento || "—"),
                        )}
                        {(r.parcelas || 1) > 1 && <span className="text-muted-foreground"> · {r.parcelas}x</span>}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(r.data_pagamento)}</TableCell>
                      <TableCell className="text-right text-xs">{formatBRL(r.valor_bruto)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {r.valor_liquido === null
                          ? <span className="text-muted-foreground">pendente</span>
                          : formatBRL(r.valor_liquido)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-zampieri-wine">
                        <div className="flex items-center justify-end gap-1">
                          <span>{r.taxa_total === null ? "—" : formatBRL(r.taxa_total)}</span>
                          {r.taxa_manual !== null && <Badge variant="outline" className="text-[9px] px-1 py-0">manual</Badge>}
                          <button
                            type="button"
                            onClick={() => setEditTaxa(r)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Editar taxa manualmente"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.status === "estornado" ? (
                          <Badge variant="outline" className="text-[10px] border-zampieri-wine text-zampieri-wine">Estornado</Badge>
                        ) : r.status === "cancelado" ? (
                          <Badge variant="outline" className="text-[10px]">Cancelado</Badge>
                        ) : r.utilizado ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-zampieri-green/15 text-zampieri-green-dark border border-zampieri-green/40 text-[10px]">✓ Utilizado</Badge>
                            <div className="text-[10px] text-muted-foreground">{formatDate(r.utilizado_em)}</div>
                            {r.utilizado_por_nome && <div className="text-[10px] text-muted-foreground">por {r.utilizado_por_nome}</div>}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status !== "estornado" && r.status !== "cancelado" && (
                          <button
                            type="button"
                            onClick={() => setCancelar(r)}
                            className="text-muted-foreground hover:text-zampieri-wine p-1"
                            title="Cancelar e estornar"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data && listaFiltrada.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">Nenhum registro encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
      {editTaxa && (
        <TaxaManualDialog
          open={!!editTaxa}
          onOpenChange={(v) => { if (!v) setEditTaxa(null); }}
          tipo="ingresso"
          id={editTaxa.id}
          valorBruto={editTaxa.valor_bruto}
          taxaAtual={editTaxa.taxa_total}
          taxaManual={editTaxa.taxa_manual}
          onSaved={fetchRelatorio}
        />
      )}
      {cancelar && (
        <CancelarIngressoDialog
          open={!!cancelar}
          onOpenChange={(v) => { if (!v) setCancelar(null); }}
          tipo="ingresso"
          id={cancelar.id}
          resumo={{
            titulo: cancelar.evento_titulo,
            comprador: cancelar.nome_comprador || undefined,
            valor: cancelar.valor_bruto,
            forma: formaLabel(
              cancelar.forma_pagamento === "credit_card" && (cancelar.parcelas || 1) > 1
                ? "credit_card_parcelado" : (cancelar.forma_pagamento || ""),
            ),
            parcelas: cancelar.parcelas || 1,
            temPagamento: !!cancelar.forma_pagamento && !cancelar.cortesia,
            cortesia: cancelar.cortesia,
          }}
          onDone={fetchRelatorio}
        />
      )}
    </div>
  );
};

export default EventosRelatorio;
