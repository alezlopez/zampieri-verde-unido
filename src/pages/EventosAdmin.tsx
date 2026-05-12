import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Users, Upload, X, ScanLine, UserPlus, RefreshCw, Link2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  horario: string | null;
  local: string | null;
  imagem_url: string | null;
  preco: number;
  preco_parcelado: number;
  max_parcelas: number;
  vagas_total: number;
  vagas_disponiveis: number;
  ativo: boolean;
  requer_autorizacao: boolean;
  tipo_evento: string;
  is_excursao: boolean;
  publico_alvo: string;
  meia_entrada_habilitada: boolean;
  percentual_meia: number;
  preco_meia: number;
  preco_meia_parcelado: number;
  categorias_meia: string[];
}

interface Ingresso {
  id: string;
  nome_comprador: string;
  quantidade: number;
  status: string;
  codigo_aluno: string | null;
  created_at: string;
  tipo_comprador: string | null;
  asaas_payment_id: string | null;
  checkout_url: string | null;
  tipo_ingresso: string | null;
  categoria_meia: string | null;
  meia_validada_portaria: boolean | null;
}

const CATEGORIAS_MEIA = [
  { value: "estudante", label: "Estudante" },
  { value: "idoso", label: "Idoso (60+)" },
  { value: "pcd", label: "PCD" },
  { value: "pcd_acompanhante", label: "Acompanhante de PCD" },
  { value: "professor", label: "Professor rede pública" },
];

const EventosAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEventoIngressos, setSelectedEventoIngressos] = useState<string | null>(null);
  const [ingressos, setIngressos] = useState<Ingresso[]>([]);
  const [filtroMeiaNaoValidada, setFiltroMeiaNaoValidada] = useState(false);

  // Manual ticket form
  type Participante = {
    tipo: "aluno" | "convidado";
    nome: string;
    cpf: string;
    data_nascimento: string;
    email: string;
    celular: string;
    codigo_aluno: string;
  };
  const emptyParticipante = (): Participante => ({
    tipo: "aluno", nome: "", cpf: "", data_nascimento: "", email: "", celular: "", codigo_aluno: "",
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorCpf, setCompradorCpf] = useState("");
  const [participantes, setParticipantes] = useState<Participante[]>([emptyParticipante()]);
  const [savingManual, setSavingManual] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [preco, setPreco] = useState("");
  const [vagasTotal, setVagasTotal] = useState("");
  const [precoParcelado, setPrecoParcelado] = useState("");
  const [maxParcelas, setMaxParcelas] = useState("");
  const [requerAutorizacao, setRequerAutorizacao] = useState(false);
  const [isExcursao, setIsExcursao] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<"apenas_alunos" | "alunos_e_convidados" | "aberto_ao_publico">("alunos_e_convidados");
  const [meiaHabilitada, setMeiaHabilitada] = useState(true);
  const [categoriasMeia, setCategoriasMeia] = useState<string[]>(["estudante", "idoso", "pcd", "pcd_acompanhante", "professor"]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Resumo financeiro (calculado com base em valor_total + status dos ingressos)
  type ResumoFinanceiro = { recebido: number; pendente: number; estornado: number; cancelado: number };
  const emptyResumo = (): ResumoFinanceiro => ({ recebido: 0, pendente: 0, estornado: 0, cancelado: 0 });
  const [resumoGeral, setResumoGeral] = useState<ResumoFinanceiro>(emptyResumo());
  const [resumoPorEvento, setResumoPorEvento] = useState<Record<string, ResumoFinanceiro>>({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/eventos/login");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchEventos = async () => {
    // Admin sees all events (including inactive) via the "Admins can manage events" policy
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("data_evento", { ascending: false });
    if (data) setEventos(data);
    setLoading(false);
  };

  const fetchResumoFinanceiro = async () => {
    const { data, error } = await supabase
      .from("ingressos")
      .select("evento_id, status, valor_total")
      .not("valor_total", "is", null);
    if (error || !data) return;
    const geral = emptyResumo();
    const porEvento: Record<string, ResumoFinanceiro> = {};
    for (const row of data as any[]) {
      const valor = Number(row.valor_total) || 0;
      if (valor <= 0) continue;
      const eid = row.evento_id as string;
      if (!porEvento[eid]) porEvento[eid] = emptyResumo();
      const bucket =
        row.status === "pago" ? "recebido" :
        row.status === "estornado" ? "estornado" :
        row.status === "cancelado" ? "cancelado" :
        row.status === "pendente" ? "pendente" : null;
      if (!bucket) continue;
      geral[bucket] += valor;
      porEvento[eid][bucket] += valor;
    }
    setResumoGeral(geral);
    setResumoPorEvento(porEvento);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEventos();
      fetchResumoFinanceiro();
    }
  }, [isAdmin]);

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setDataEvento("");
    setHorario("");
    setLocal("");
    setImagemUrl("");
    setPreco("");
    setPrecoParcelado("");
    setMaxParcelas("");
    setVagasTotal("");
    setRequerAutorizacao(false);
    setIsExcursao(false);
    setPublicoAlvo("alunos_e_convidados");
    setMeiaHabilitada(true);
    setCategoriasMeia(["estudante", "idoso", "pcd", "pcd_acompanhante", "professor"]);
    setImagemFile(null);
    setImagemPreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (evento: Evento) => {
    setTitulo(evento.titulo);
    setDescricao(evento.descricao || "");
    setDataEvento(evento.data_evento);
    setHorario(evento.horario || "");
    setLocal(evento.local || "");
    setImagemUrl(evento.imagem_url || "");
    setPreco(String(evento.preco));
    setPrecoParcelado(String(evento.preco_parcelado));
    setMaxParcelas(String(evento.max_parcelas));
    setVagasTotal(String(evento.vagas_total));
    setRequerAutorizacao(evento.requer_autorizacao);
    setIsExcursao(evento.is_excursao || false);
    setPublicoAlvo((evento.publico_alvo as any) || "alunos_e_convidados");
    setMeiaHabilitada(evento.meia_entrada_habilitada ?? true);
    setCategoriasMeia(
      Array.isArray(evento.categorias_meia) && evento.categorias_meia.length > 0
        ? evento.categorias_meia
        : ["estudante", "idoso", "pcd", "pcd_acompanhante", "professor"]
    );
    setImagemFile(null);
    setImagemPreview(evento.imagem_url || null);
    setEditingId(evento.id);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagemFile(file);
    setImagemPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `eventos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("zampieri").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload da imagem", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("zampieri").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!titulo || !dataEvento) {
      toast({ title: "Preencha título e data", variant: "destructive" });
      return;
    }
    if (meiaHabilitada && categoriasMeia.length === 0) {
      toast({ title: "Selecione ao menos uma categoria de meia-entrada", variant: "destructive" });
      return;
    }
    const precoNum = parseFloat(preco) || 0;
    const precoParceladoNum = parseFloat(precoParcelado) || 0;
    if (precoParceladoNum > 0 && precoParceladoNum < precoNum) {
      toast({ title: "Preço parcelado não pode ser menor que o à vista", variant: "destructive" });
      return;
    }

    setUploading(true);
    let finalImagemUrl = imagemUrl || null;

    if (imagemFile) {
      const url = await uploadImage(imagemFile);
      if (url) finalImagemUrl = url;
      else { setUploading(false); return; }
    }

    const vagasNum = parseInt(vagasTotal) || 0;
    const maxParcelasNum = Math.max(1, Math.min(parseInt(maxParcelas) || 1, 12));
    const precoMeia = Number((precoNum / 2).toFixed(2));
    const precoMeiaParcelado = Number((precoParceladoNum / 2).toFixed(2));

    const payload = {
      titulo,
      descricao: descricao || null,
      data_evento: dataEvento,
      horario: horario || null,
      local: local || null,
      imagem_url: finalImagemUrl,
      preco: precoNum,
      preco_parcelado: precoParceladoNum,
      max_parcelas: maxParcelasNum,
      vagas_total: vagasNum,
      vagas_disponiveis: editingId ? undefined : vagasNum, // não sobrescrever em edição
      requer_autorizacao: requerAutorizacao,
      tipo_evento: publicoAlvo === "apenas_alunos" ? "somente_alunos" : "alunos_convidados",
      is_excursao: isExcursao,
      publico_alvo: publicoAlvo,
      meia_entrada_habilitada: meiaHabilitada,
      preco_meia: precoMeia,
      preco_meia_parcelado: precoMeiaParcelado,
      categorias_meia: categoriasMeia,
    };
    if (payload.vagas_disponiveis === undefined) delete (payload as any).vagas_disponiveis;

    if (editingId) {
      const { error } = await supabase.from("eventos").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      toast({ title: "Evento atualizado!" });
    } else {
      const { error } = await supabase.from("eventos").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      toast({ title: "Evento criado!" });
    }

    setUploading(false);
    resetForm();
    fetchEventos();
  };

  const toggleAtivo = async (evento: Evento) => {
    await supabase.from("eventos").update({ ativo: !evento.ativo }).eq("id", evento.id);
    fetchEventos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    await supabase.from("eventos").delete().eq("id", id);
    fetchEventos();
    toast({ title: "Evento excluído" });
  };

  const fetchIngressos = async (eventoId: string) => {
    if (selectedEventoIngressos === eventoId) {
      setSelectedEventoIngressos(null);
      return;
    }
    const { data } = await supabase
      .from("ingressos")
      .select("*")
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: false });
    if (data) setIngressos(data);
    setSelectedEventoIngressos(eventoId);
  };

  const resetManualForm = () => {
    setCompradorNome("");
    setCompradorCpf("");
    setParticipantes([emptyParticipante()]);
    setShowManualForm(false);
  };

  const updateParticipante = (idx: number, patch: Partial<Participante>) => {
    setParticipantes((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const handleSaveManual = async (eventoId: string) => {
    if (!user) return;
    if (!compradorNome.trim()) {
      toast({ title: "Informe o nome do comprador", variant: "destructive" });
      return;
    }
    const validos = participantes.filter((p) => p.nome.trim());
    if (validos.length === 0) {
      toast({ title: "Adicione ao menos um participante", variant: "destructive" });
      return;
    }

    setSavingManual(true);
    try {
      // Recheck vagas
      const { data: ev } = await supabase.from("eventos").select("vagas_disponiveis").eq("id", eventoId).single();
      if (ev && ev.vagas_disponiveis < validos.length) {
        toast({ title: "Vagas insuficientes", description: `Restam ${ev.vagas_disponiveis} vaga(s).`, variant: "destructive" });
        setSavingManual(false);
        return;
      }

      // Resolve user_id by CPF (fallback: admin)
      let targetUserId = user.id;
      const cpfClean = compradorCpf.replace(/\D/g, "");
      if (cpfClean) {
        const { data: foundId } = await supabase.rpc("find_user_id_by_cpf", { p_cpf: cpfClean });
        if (foundId) targetUserId = foundId as string;
      }

      const records = validos.map((p) => ({
        evento_id: eventoId,
        user_id: targetUserId,
        nome_comprador: compradorNome.trim(),
        codigo_aluno: p.tipo === "aluno" ? (p.codigo_aluno.trim() || null) : null,
        quantidade: 1,
        status: "pago",
        tipo_participante: p.tipo,
        nome_participante: p.nome.trim(),
        cpf_participante: p.cpf.replace(/\D/g, "") || null,
        data_nascimento_participante: p.data_nascimento || null,
        email_participante: p.email.trim() || null,
        celular_participante: p.celular.replace(/\D/g, "") || null,
      }));

      const { error } = await supabase.from("ingressos").insert(records);
      if (error) {
        toast({ title: "Erro ao criar ingressos", description: error.message, variant: "destructive" });
        setSavingManual(false);
        return;
      }

      toast({ title: `${records.length} ingresso(s) criado(s)!` });
      resetManualForm();
      // Refresh
      const { data: ings } = await supabase.from("ingressos").select("*").eq("evento_id", eventoId).order("created_at", { ascending: false });
      if (ings) setIngressos(ings);
      fetchEventos();
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
    } finally {
      setSavingManual(false);
    }
  };

  const refreshIngressos = async (eventoId: string) => {
    const { data } = await supabase.from("ingressos").select("*").eq("evento_id", eventoId).order("created_at", { ascending: false });
    if (data) setIngressos(data);
  };

  const handleGerarCheckout = async (ing: Ingresso, eventoId: string) => {
    setSyncingId(ing.id);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-create-checkout", {
        body: { ingresso_ids: [ing.id], forma_pagamento: "pix", parcelas: 1 },
      });
      if (error) throw error;
      toast({ title: "Checkout gerado", description: data?.checkout_url ? "Link disponível." : "Concluído." });
      await refreshIngressos(eventoId);
    } catch (e: any) {
      toast({ title: "Erro ao gerar checkout", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const handleReconciliar = async (ing: Ingresso, eventoId: string) => {
    setSyncingId(ing.id);
    try {
      const { error } = await supabase.functions.invoke("asaas-sync-payment", {
        body: ing.asaas_payment_id ? { payment_id: ing.asaas_payment_id } : { ingresso_id: ing.id },
      });
      if (error) throw error;
      toast({ title: "Pagamento reconciliado" });
      await refreshIngressos(eventoId);
      fetchEventos();
    } catch (e: any) {
      toast({ title: "Erro ao reconciliar", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Painel Administrativo" />
      <div className="flex-1 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/eventos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eventos
          </Link>
          <div className="flex gap-2">
            <Link to="/eventos/admin/scanner">
              <Button variant="outline" className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
                <ScanLine className="w-4 h-4 mr-2" />
                Scanner QR
              </Button>
            </Link>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-zampieri-green-dark mb-6">Painel Administrativo — Eventos</h1>

        {/* Resumo financeiro geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-xl font-bold text-zampieri-green-dark">{formatBRL(resumoGeral.recebido)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-zampieri-gold">{formatBRL(resumoGeral.pendente)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Estornado</p>
              <p className="text-xl font-bold text-zampieri-wine">{formatBRL(resumoGeral.estornado)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cancelado</p>
              <p className="text-xl font-bold text-muted-foreground">{formatBRL(resumoGeral.cancelado)}</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-[11px] text-muted-foreground mb-6">
          Calculado a partir do valor de cada ingresso. Ingressos anteriores sem valor registrado não entram no total.
        </p>

        {/* Form */}

        {showForm && (
          <Card className="mb-6 border-border">
            <CardHeader>
              <CardTitle className="text-zampieri-green-dark">{editingId ? "Editar Evento" : "Novo Evento"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Horário</label>
                  <Input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="18:00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Local</label>
                  <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Auditório" />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço à Vista (R$)</label>
                  <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço Parcelado (R$)</label>
                  <Input type="number" step="0.01" value={precoParcelado} onChange={(e) => setPrecoParcelado(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Máximo de Parcelas</label>
                  <Input type="number" value={maxParcelas} onChange={(e) => setMaxParcelas(e.target.value)} placeholder="1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Total de Vagas</label>
                  <Input type="number" value={vagasTotal} onChange={(e) => setVagasTotal(e.target.value)} placeholder="100" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Imagem do Evento</label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 cursor-pointer border border-input rounded-md px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                    <Upload className="w-4 h-4 text-zampieri-gold" />
                    <span>{imagemFile ? imagemFile.name : "Selecionar imagem..."}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </label>
                  {imagemPreview && (
                    <div className="mt-2 relative inline-block">
                      <img src={imagemPreview} alt="Preview" className="h-32 rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImagemFile(null); setImagemPreview(null); setImagemUrl(""); }}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requer-autorizacao"
                  checked={requerAutorizacao}
                  onCheckedChange={(checked) => setRequerAutorizacao(checked === true)}
                />
                <label htmlFor="requer-autorizacao" className="text-sm font-medium cursor-pointer">
                  Requer autorização?
                </label>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Público-alvo (quem pode comprar)</label>
                <Select value={publicoAlvo} onValueChange={(v) => setPublicoAlvo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apenas_alunos">Apenas alunos matriculados</SelectItem>
                    <SelectItem value="alunos_e_convidados">Alunos e convidados (padrão)</SelectItem>
                    <SelectItem value="aberto_ao_publico">Aberto ao público (inclui não-alunos)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  "Aberto ao público" permite que compradores externos (sem matrícula) comprem ingressos.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-excursao"
                  checked={isExcursao}
                  onCheckedChange={(checked) => setIsExcursao(checked === true)}
                />
                <label htmlFor="is-excursao" className="text-sm font-medium cursor-pointer">
                  Evento é excursão?
                </label>
              </div>

              {/* Meia-entrada (Lei 12.933/2013) */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="meia-habilitada"
                    checked={meiaHabilitada}
                    onCheckedChange={(checked) => setMeiaHabilitada(checked === true)}
                  />
                  <label htmlFor="meia-habilitada" className="text-sm font-medium cursor-pointer">
                    Habilitar meia-entrada (Lei 12.933/2013)
                  </label>
                </div>
                {meiaHabilitada && (
                  <div className="bg-zampieri-cream/40 border border-zampieri-gold/30 rounded-md p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Cota legal (40%)</p>
                        <p className="font-semibold text-zampieri-green-dark">
                          {Math.floor((parseInt(vagasTotal) || 0) * 0.4)} de {parseInt(vagasTotal) || 0} vagas
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Meia à vista</p>
                        <p className="font-semibold text-zampieri-green-dark">
                          R$ {((parseFloat(preco) || 0) / 2).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Meia parcelado total</p>
                        <p className="font-semibold text-zampieri-green-dark">
                          R$ {((parseFloat(precoParcelado) || 0) / 2).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-2">Categorias aceitas:</p>
                      <div className="flex flex-wrap gap-3">
                        {CATEGORIAS_MEIA.map((cat) => (
                          <label key={cat.value} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={categoriasMeia.includes(cat.value)}
                              onCheckedChange={(checked) =>
                                setCategoriasMeia((prev) =>
                                  checked === true
                                    ? Array.from(new Set([...prev, cat.value]))
                                    : prev.filter((c) => c !== cat.value)
                                )
                              }
                            />
                            {cat.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">
                      Documento original será exigido na portaria conforme Lei 12.933/2013.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events list */}
        <div className="space-y-4">
          {eventos.map((evento) => (
            <Card key={evento.id} className={`border-border ${!evento.ativo ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zampieri-green-dark">{evento.titulo}</h3>
                      <Badge variant={evento.ativo ? "default" : "secondary"}>
                        {evento.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                      {evento.horario && ` às ${evento.horario}`}
                      {evento.local && ` — ${evento.local}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      À vista: R$ {evento.preco.toFixed(2).replace(".", ",")}
                      {evento.preco_parcelado > 0 && ` | Parcelado: ${evento.max_parcelas}x de R$ ${(evento.preco_parcelado / evento.max_parcelas).toFixed(2).replace(".", ",")}`}
                      {" "}— {evento.vagas_disponiveis}/{evento.vagas_total} vagas
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => fetchIngressos(evento.id)}>
                      <Users className="w-4 h-4 mr-1" />
                      Ingressos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAtivo(evento)}>
                      {evento.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(evento)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(evento.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Ingressos list */}
                {selectedEventoIngressos === evento.id && (() => {
                  const totalMeias = ingressos.filter(i => i.tipo_ingresso === "meia" && i.status !== "cancelado").length;
                  const meiasValidadas = ingressos.filter(i => i.tipo_ingresso === "meia" && i.meia_validada_portaria).length;
                  const meiasPendentesValidacao = ingressos.filter(i => i.tipo_ingresso === "meia" && i.status === "pago" && !i.meia_validada_portaria).length;
                  const exportarCsv = () => {
                    const header = ["id", "comprador", "codigo_aluno", "qtd", "status", "tipo_comprador", "tipo_ingresso", "categoria_meia", "meia_validada", "asaas_payment_id", "criado_em"];
                    const rows = ingressos.map(i => [
                      i.id, i.nome_comprador || "", i.codigo_aluno || "", i.quantidade, i.status,
                      i.tipo_comprador || "", i.tipo_ingresso || "inteira", i.categoria_meia || "",
                      i.meia_validada_portaria ? "sim" : "nao", i.asaas_payment_id || "", i.created_at,
                    ]);
                    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ingressos-${evento.titulo.replace(/[^a-z0-9]/gi, "_")}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  };
                  const ingressosVisiveis = filtroMeiaNaoValidada
                    ? ingressos.filter(i => i.tipo_ingresso === "meia" && i.status === "pago" && !i.meia_validada_portaria)
                    : ingressos;
                  return (
                  <div className="mt-4 border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-medium text-sm">Ingressos vendidos:</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={filtroMeiaNaoValidada ? "default" : "outline"}
                          className={filtroMeiaNaoValidada ? "bg-zampieri-wine hover:bg-zampieri-wine/90 text-white" : ""}
                          onClick={() => setFiltroMeiaNaoValidada((v) => !v)}
                        >
                          Meias não validadas {meiasPendentesValidacao > 0 && `(${meiasPendentesValidacao})`}
                        </Button>
                        <Button size="sm" variant="outline" onClick={exportarCsv}>
                          Exportar CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream"
                          onClick={() => { resetManualForm(); setShowManualForm(true); }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Adicionar ingresso manual
                        </Button>
                      </div>
                    </div>

                    {evento.meia_entrada_habilitada && (
                      <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                        <strong>Meias:</strong> {totalMeias} vendidas · {meiasValidadas} validadas na portaria · {meiasPendentesValidacao} aguardando validação
                      </div>
                    )}

                    {showManualForm && (
                      <Card className="border-zampieri-gold/40 bg-zampieri-cream">
                        <CardContent className="p-4 space-y-3">
                          <h5 className="font-semibold text-sm text-zampieri-green-dark">Novo ingresso manual (status: pago)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium">Nome do comprador *</label>
                              <Input value={compradorNome} onChange={(e) => setCompradorNome(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs font-medium">CPF do comprador (vincula usuário)</label>
                              <Input value={compradorCpf} onChange={(e) => setCompradorCpf(e.target.value)} placeholder="000.000.000-00" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">Participantes ({participantes.length})</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setParticipantes((p) => [...p, emptyParticipante()])}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Adicionar
                              </Button>
                            </div>
                            {participantes.map((p, idx) => (
                              <div key={idx} className="border border-border rounded-md p-3 space-y-2 bg-white">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-zampieri-green-dark">Participante {idx + 1}</span>
                                  {participantes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setParticipantes((prev) => prev.filter((_, i) => i !== idx))}
                                      className="text-destructive"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <RadioGroup
                                  value={p.tipo}
                                  onValueChange={(v) => updateParticipante(idx, { tipo: v as "aluno" | "convidado" })}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="aluno" id={`tp-aluno-${idx}`} />
                                    <Label htmlFor={`tp-aluno-${idx}`} className="cursor-pointer text-xs">Aluno</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="convidado" id={`tp-conv-${idx}`} />
                                    <Label htmlFor={`tp-conv-${idx}`} className="cursor-pointer text-xs">Convidado</Label>
                                  </div>
                                </RadioGroup>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <Input placeholder="Nome *" value={p.nome} onChange={(e) => updateParticipante(idx, { nome: e.target.value })} />
                                  <Input placeholder="CPF" value={p.cpf} onChange={(e) => updateParticipante(idx, { cpf: e.target.value })} />
                                  {p.tipo === "aluno" && (
                                    <Input placeholder="Código do aluno" value={p.codigo_aluno} onChange={(e) => updateParticipante(idx, { codigo_aluno: e.target.value })} />
                                  )}
                                  <Input type="date" placeholder="Data de nascimento" value={p.data_nascimento} onChange={(e) => updateParticipante(idx, { data_nascimento: e.target.value })} />
                                  <Input type="email" placeholder="E-mail" value={p.email} onChange={(e) => updateParticipante(idx, { email: e.target.value })} />
                                  <Input placeholder="Celular" value={p.celular} onChange={(e) => updateParticipante(idx, { celular: e.target.value })} />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={() => handleSaveManual(evento.id)} disabled={savingManual} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                              {savingManual ? "Salvando..." : "Salvar ingressos"}
                            </Button>
                            <Button variant="outline" onClick={resetManualForm}>Cancelar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {ingressosVisiveis.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {filtroMeiaNaoValidada ? "Nenhuma meia aguardando validação." : "Nenhum ingresso vendido."}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {ingressosVisiveis.map((ing) => (
                          <div key={ing.id} className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 text-sm bg-muted/50 rounded p-2">
                            <div className="flex-1">
                              <span className="font-medium">{ing.nome_comprador}</span>
                              {ing.codigo_aluno && <span className="text-muted-foreground ml-2">Aluno: {ing.codigo_aluno}</span>}
                              <span className="text-muted-foreground ml-2">Qtd: {ing.quantidade}</span>
                              {ing.tipo_comprador && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {ing.tipo_comprador === "externo" ? "Externo" : "Aluno"}
                                </Badge>
                              )}
                              {ing.tipo_ingresso === "meia" && (
                                <Badge className="ml-2 text-[10px] bg-orange-100 text-orange-800 border border-orange-300">
                                  MEIA{ing.categoria_meia ? ` · ${ing.categoria_meia}` : ""}
                                  {ing.meia_validada_portaria ? " ✓" : ""}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {ing.status === "pendente" && !ing.checkout_url && (
                                <Button size="sm" variant="outline" disabled={syncingId === ing.id}
                                  onClick={() => handleGerarCheckout(ing, evento.id)}>
                                  <Link2 className="w-3 h-3 mr-1" /> Gerar checkout
                                </Button>
                              )}
                              {ing.status === "pendente" && ing.asaas_payment_id && (
                                <Button size="sm" variant="outline" disabled={syncingId === ing.id}
                                  onClick={() => handleReconciliar(ing, evento.id)}>
                                  <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === ing.id ? "animate-spin" : ""}`} /> Reconciliar
                                </Button>
                              )}
                              {ing.checkout_url && (
                                <a href={ing.checkout_url} target="_blank" rel="noreferrer" className="text-xs underline text-zampieri-green-dark">
                                  Link
                                </a>
                              )}
                              <Badge className={
                                ing.status === "pago" ? "bg-zampieri-green/15 text-zampieri-green-dark border border-zampieri-green/40" :
                                ing.status === "cancelado" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {ing.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default EventosAdmin;
