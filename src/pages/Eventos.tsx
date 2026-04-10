import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, MapPin, Users, Ticket, ShieldAlert, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const Eventos = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const fetchEventos = async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("ativo", true)
        .order("data_evento", { ascending: true });

      if (!error && data) setEventos(data);
      setLoading(false);
    };
    fetchEventos();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "Gratuito" : `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-800 to-green-600 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img
              src="https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/logo%20zampieri.webp"
              alt="Logo Zampieri"
              className="h-10 w-10 rounded-full"
            />
            <div>
              <h1 className="text-lg font-bold">Colégio Zampieri</h1>
              <p className="text-xs text-green-200">Eventos</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/eventos/admin">
                <Button variant="outline" size="sm" className="text-green-800 border-white bg-white hover:bg-green-50">
                  Painel Admin
                </Button>
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/eventos/meus-ingressos">
                  <Button variant="outline" size="sm" className="text-green-800 border-white bg-white hover:bg-green-50">
                    <Ticket className="w-4 h-4 mr-1" />
                    Meus Ingressos
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="text-red-700 border-white bg-white hover:bg-red-50" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link to="/eventos/login">
                <Button variant="outline" size="sm" className="text-green-800 border-white bg-white hover:bg-green-50">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-green-700 to-green-500 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">🎉 Eventos do Colégio Zampieri</h2>
          <p className="text-green-100 text-lg max-w-2xl mx-auto">
            Confira nossos próximos eventos e garanta seu ingresso!
          </p>
        </div>
      </div>

      {/* Events list */}
      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : eventos.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">Nenhum evento disponível no momento</h3>
            <p className="text-gray-400 mt-2">Fique de olho! Em breve teremos novidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((evento) => (
              <Card key={evento.id} className="overflow-hidden hover:shadow-xl transition-shadow border-green-100">
                {evento.imagem_url && (
                  <div className={`h-48 overflow-hidden relative ${evento.vagas_disponiveis <= 0 ? "opacity-50" : ""}`}>
                    <img
                      src={evento.imagem_url}
                      alt={evento.titulo}
                      className="w-full h-full object-cover"
                    />
                    {evento.vagas_disponiveis <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Badge variant="destructive" className="text-base px-4 py-1">ESGOTADO</Badge>
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-green-800">{evento.titulo}</CardTitle>
                    {evento.vagas_disponiveis <= 0 && (
                      <Badge variant="destructive">ESGOTADO</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {evento.descricao && (
                    <p className="text-muted-foreground text-sm line-clamp-3">{evento.descricao}</p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 text-green-600" />
                    {formatDate(evento.data_evento)}
                    {evento.horario && ` às ${evento.horario}`}
                  </div>
                  {evento.local && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      {evento.local}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2 text-green-600" />
                    {evento.vagas_disponiveis} vagas disponíveis
                  </div>
                  <div className="pt-2">
                    <p className="text-xl font-bold text-green-700">{formatPrice(evento.preco)}</p>
                    {evento.preco_parcelado > 0 && evento.max_parcelas > 1 && (
                      <p className="text-sm text-muted-foreground">
                        ou {evento.max_parcelas}x de R$ {(evento.preco_parcelado / evento.max_parcelas).toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {evento.vagas_disponiveis > 0 ? (
                    <Link to={user ? `/eventos/comprar/${evento.id}` : "/eventos/login"} className="w-full">
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Ticket className="w-4 h-4 mr-2" />
                        Comprar Ingresso
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full">Esgotado</Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Eventos;
