import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Users } from "lucide-react";
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
  vagas_total: number;
  vagas_disponiveis: number;
  ativo: boolean;
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
    setVagasTotal("");
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
    setVagasTotal(String(evento.vagas_total));
    setEditingId(evento.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!titulo || !dataEvento) {
      toast({ title: "Preencha título e data", variant: "destructive" });
      return;
    }

    const vagasNum = parseInt(vagasTotal) || 0;
    const precoNum = parseFloat(preco) || 0;

    const payload = {
      titulo,
      descricao: descricao || null,
      data_evento: dataEvento,
      horario: horario || null,
      local: local || null,
      imagem_url: imagemUrl || null,
      preco: precoNum,
      vagas_total: vagasNum,
      vagas_disponiveis: vagasNum,
    };

    if (editingId) {
      const { error } = await supabase.from("eventos").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Evento atualizado!" });
    } else {
      const { error } = await supabase.from("eventos").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Evento criado!" });
    }

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
                  <label className="text-sm font-medium">Preço (R$)</label>
                  <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0.00" />
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
                <label className="text-sm font-medium">URL da Imagem</label>
                <Input value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Salvar</Button>
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
                      R$ {evento.preco.toFixed(2).replace(".", ",")} — {evento.vagas_disponiveis}/{evento.vagas_total} vagas
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
