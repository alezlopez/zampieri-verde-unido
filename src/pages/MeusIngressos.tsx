import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, LogOut } from "lucide-react";

interface IngressoComEvento {
  id: string;
  quantidade: number;
  status: string;
  nome_comprador: string;
  nome_participante: string | null;
  tipo_participante: string;
  checkout_url: string | null;
  created_at: string;
  eventos: { titulo: string; data_evento: string; horario: string | null; local: string | null } | null;
}

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pago: "bg-green-100 text-green-800 border-green-300",
  cancelado: "bg-red-100 text-red-800 border-red-300",
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
        .select("id, quantidade, status, nome_comprador, nome_participante, tipo_participante, checkout_url, created_at, eventos(titulo, data_evento, horario, local)")
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/eventos" className="inline-flex items-center text-green-700 hover:text-green-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eventos
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-green-800 mb-6">
          <Ticket className="w-6 h-6 inline mr-2" />
          Meus Ingressos
        </h1>

        {ingressos.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">Você ainda não comprou nenhum ingresso.</p>
            <Link to="/eventos">
              <Button className="mt-4 bg-green-600 hover:bg-green-700">Ver Eventos</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ingressos.map((ingresso) => (
              <Card key={ingresso.id} className="border-green-100">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-green-800">
                        {ingresso.eventos?.titulo || "Evento"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ingresso.eventos?.data_evento &&
                          new Date(ingresso.eventos.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                        {ingresso.eventos?.horario && ` às ${ingresso.eventos.horario}`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ingresso.quantidade}x — {ingresso.nome_comprador}
                      </p>
                    </div>
                    <Badge className={statusColors[ingresso.status] || ""}>
                      {ingresso.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeusIngressos;
