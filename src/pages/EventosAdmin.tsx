import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Users, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
}

interface Ingresso {
  id: string;
  nome_comprador: string;
  quantidade: number;
  status: string;
  codigo_aluno: string | null;
  created_at: string;
}

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
  const [tipoEvento, setTipoEvento] = useState<"somente_alunos" | "alunos_convidados">("alunos_convidados");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    if (isAdmin) fetchEventos();
  }, [isAdmin]);

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
    setTipoEvento("alunos_convidados");
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
    setTipoEvento((evento.tipo_evento as "somente_alunos" | "alunos_convidados") || "alunos_convidados");
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

    setUploading(true);
    let finalImagemUrl = imagemUrl || null;

    if (imagemFile) {
      const url = await uploadImage(imagemFile);
      if (url) finalImagemUrl = url;
      else { setUploading(false); return; }
    }

    const vagasNum = parseInt(vagasTotal) || 0;
    const precoNum = parseFloat(preco) || 0;
    const precoParceladoNum = parseFloat(precoParcelado) || 0;
    const maxParcelasNum = parseInt(maxParcelas) || 1;

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
      vagas_disponiveis: vagasNum,
      requer_autorizacao: requerAutorizacao,
      tipo_evento: tipoEvento,
    };

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/eventos" className="inline-flex items-center text-green-700 hover:text-green-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eventos
          </Link>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-green-800 mb-6">Painel Administrativo — Eventos</h1>

        {/* Form */}
        {showForm && (
          <Card className="mb-6 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">{editingId ? "Editar Evento" : "Novo Evento"}</CardTitle>
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
                    <Upload className="w-4 h-4 text-green-600" />
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
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={uploading}>
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
            <Card key={evento.id} className={`border-green-100 ${!evento.ativo ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-green-800">{evento.titulo}</h3>
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
                {selectedEventoIngressos === evento.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">Ingressos vendidos:</h4>
                    {ingressos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum ingresso vendido.</p>
                    ) : (
                      <div className="space-y-2">
                        {ingressos.map((ing) => (
                          <div key={ing.id} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                            <div>
                              <span className="font-medium">{ing.nome_comprador}</span>
                              {ing.codigo_aluno && <span className="text-muted-foreground ml-2">Aluno: {ing.codigo_aluno}</span>}
                              <span className="text-muted-foreground ml-2">Qtd: {ing.quantidade}</span>
                            </div>
                            <Badge className={
                              ing.status === "pago" ? "bg-green-100 text-green-800" :
                              ing.status === "cancelado" ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {ing.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventosAdmin;
