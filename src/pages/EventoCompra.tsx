import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, MapPin, Minus, Plus, ShieldAlert } from "lucide-react";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  horario: string | null;
  local: string | null;
  preco: number;
  vagas_disponiveis: number;
  requer_autorizacao: boolean;
}

const EventoCompra = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantidade, setQuantidade] = useState(1);
  const [nomeComprador, setNomeComprador] = useState("");
  const [codigoAluno, setCodigoAluno] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/eventos/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchEvento = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setEvento(data);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  useEffect(() => {
    if (user?.user_metadata?.nome) {
      setNomeComprador(user.user_metadata.nome);
    }
  }, [user]);

  const handleComprar = async () => {
    if (!evento || !user) return;
    if (!nomeComprador.trim()) {
      toast({ title: "Informe o nome do comprador", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ingressos").insert({
        evento_id: evento.id,
        user_id: user.id,
        codigo_aluno: codigoAluno || null,
        nome_comprador: nomeComprador.trim(),
        quantidade,
        status: "pendente",
      });

      if (error) throw error;

      toast({ title: "Ingresso reservado!", description: "Seu ingresso está pendente de pagamento." });
      navigate("/eventos/meus-ingressos");
    } catch (err: any) {
      toast({ title: "Erro ao reservar ingresso", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const total = evento.preco * quantidade;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="container mx-auto max-w-lg">
        <Link to="/eventos" className="inline-flex items-center text-green-700 hover:text-green-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para eventos
        </Link>

        <Card className="border-green-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800">{evento.titulo}</CardTitle>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(evento.data_evento)} {evento.horario && `às ${evento.horario}`}
              </div>
              {evento.local && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {evento.local}
                </div>
              )}
            </div>
            {evento.requer_autorizacao && (
              <div className="flex items-center gap-2 mt-2 text-orange-600 bg-orange-50 rounded-md px-3 py-2 text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Este evento requer autorização. Após a compra, sua participação ficará sujeita à aprovação.</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do comprador *</label>
              <Input value={nomeComprador} onChange={(e) => setNomeComprador(e.target.value)} placeholder="Seu nome completo" />
            </div>

            <div>
              <label className="text-sm font-medium">Código do aluno (opcional)</label>
              <Input value={codigoAluno} onChange={(e) => setCodigoAluno(e.target.value)} placeholder="Ex: 12345" />
            </div>

            <div>
              <label className="text-sm font-medium">Quantidade</label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-bold w-8 text-center">{quantidade}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(Math.min(evento.vagas_disponiveis, quantidade + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{evento.vagas_disponiveis} vagas disponíveis</p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-green-700">
                  {total === 0 ? "Gratuito" : `R$ ${total.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <Button
                onClick={handleComprar}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? "Processando..." : "Reservar Ingresso"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                O pagamento será processado separadamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventoCompra;
