import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, LogOut, ExternalLink, Eye } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface IngressoComEvento {
  id: string;
  quantidade: number;
  status: string;
  nome_comprador: string;
  nome_participante: string | null;
  tipo_participante: string;
  checkout_url: string | null;
  comprovante_estorno_url: string | null;
  cortesia: boolean | null;
  created_at: string;
  eventos: { titulo: string; data_evento: string; horario: string | null; local: string | null } | null;
}

const statusStyles: Record<string, string> = {
  pendente: "bg-zampieri-gold/20 text-zampieri-green-dark border-zampieri-gold/40",
  pago: "bg-zampieri-green/15 text-zampieri-green-dark border-zampieri-green/40",
  cancelado: "bg-destructive/15 text-destructive border-destructive/40",
  estornado: "bg-zampieri-wine/15 text-zampieri-wine border-zampieri-wine/40",
};

const MeusIngressos = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [ingressos, setIngressos] = useState<IngressoComEvento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/eventos/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchIngressos = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("ingressos")
        .select("id, quantidade, status, nome_comprador, nome_participante, tipo_participante, checkout_url, comprovante_estorno_url, created_at, eventos(titulo, data_evento, horario, local)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setIngressos(data as unknown as IngressoComEvento[]);
      setLoading(false);
    };
    fetchIngressos();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/eventos");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" />
      </div>
    );
  }

  const headerActions = (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zampieri-wine hover:bg-zampieri-cream">
      <LogOut className="w-4 h-4 mr-2" />
      Sair
    </Button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Meus Ingressos" actions={headerActions} />

      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Link to="/eventos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eventos
          </Link>

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-6 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-zampieri-gold" />
            Meus Ingressos
          </h1>

          {ingressos.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">Você ainda não comprou nenhum ingresso.</p>
              <Link to="/eventos">
                <Button className="mt-4 bg-zampieri-green-dark hover:bg-zampieri-green text-white">Ver Eventos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ingressos.map((ingresso) => (
                <Card key={ingresso.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="font-serif font-semibold text-zampieri-green-dark">
                          {ingresso.eventos?.titulo || "Evento"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {ingresso.eventos?.data_evento &&
                            new Date(ingresso.eventos.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                          {ingresso.eventos?.horario && ` às ${ingresso.eventos.horario}`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ingresso.nome_participante || ingresso.nome_comprador}
                          {ingresso.tipo_participante === "convidado" && (
                            <span className="ml-1 text-xs text-zampieri-wine">(convidado)</span>
                          )}
                        </p>
                      </div>
                      <Badge className={`border ${statusStyles[ingresso.status] || ""} capitalize`}>
                        {ingresso.status}
                      </Badge>
                    </div>
                    {ingresso.status === "pago" && (
                      <div className="mt-3">
                        <Link to={`/eventos/ingresso/${ingresso.id}`}>
                          <Button size="sm" className="bg-zampieri-green-dark hover:bg-zampieri-green text-white w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Ingresso
                          </Button>
                        </Link>
                      </div>
                    )}
                    {ingresso.status === "estornado" && (
                      <div className="mt-3">
                        {ingresso.comprovante_estorno_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zampieri-wine/40 text-zampieri-wine hover:bg-zampieri-wine/10 w-full"
                            onClick={() => window.open(ingresso.comprovante_estorno_url!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Comprovante de Estorno
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Estorno realizado. Comprovante ainda não disponível.</p>
                        )}
                      </div>
                    )}
                    {ingresso.status === "pendente" && ingresso.checkout_url && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="bg-zampieri-gold hover:bg-zampieri-gold-light text-zampieri-green-dark w-full"
                          onClick={() => window.open(ingresso.checkout_url!, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Pagar
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Ao clicar em Pagar, você será redirecionado para o ambiente seguro do sistema Asaas. Insira os dados do responsável pela compra, não os do(a) aluno(a).
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MeusIngressos;
