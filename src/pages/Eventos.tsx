import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, MapPin, Users, Ticket, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { EventosHeader } from "@/components/EventosHeader";

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
  publico_alvo: "apenas_alunos" | "alunos_e_convidados" | "aberto_ao_publico";
}

const Eventos = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoComprador, setTipoComprador] = useState<"aluno" | "externo" | null>(null);
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const fetchEventos = async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("ativo", true)
        .gte("data_evento", hoje)
        .order("data_evento", { ascending: true });

      if (!error && data) setEventos(data as any);
      setLoading(false);
    };
    fetchEventos();
  }, []);

  // Resolve tipo de comprador para filtrar/avisar
  useEffect(() => {
    const resolve = async () => {
      if (!user) { setTipoComprador(null); return; }
      const { data } = await supabase
        .from("compradores_externos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setTipoComprador(data ? "externo" : "aluno");
    };
    resolve();
  }, [user]);

  const podeComprar = (e: Evento) => {
    if (e.publico_alvo === "aberto_ao_publico") return true;
    if (!user) return true; // mostra; ao clicar vai para login
    if (tipoComprador === "aluno") return true;
    return false; // externo só pode comprar aberto_ao_publico
  };

  const labelPublico = (p: Evento["publico_alvo"]) =>
    p === "aberto_ao_publico" ? "Aberto ao público" :
    p === "apenas_alunos" ? "Apenas alunos" : "Alunos e convidados";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatPrice = (price: number) => {
    return price === 0 ? "Gratuito" : `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const headerActions = (
    <>
      {isAdmin && (
        <Link to="/eventos/admin">
          <Button variant="outline" size="sm" className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
            Painel Admin
          </Button>
        </Link>
      )}
      {user ? (
        <>
          <Link to="/eventos/meus-ingressos">
            <Button size="sm" className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
              <Ticket className="w-4 h-4 mr-1" />
              Meus Ingressos
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-zampieri-wine hover:bg-zampieri-cream" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </>
      ) : (
        <Link to="/eventos/login">
          <Button size="sm" className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
            Entrar
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Eventos · Ingressos online" actions={headerActions} />

      {/* Banner */}
      <div className="bg-gradient-to-r from-zampieri-green-dark to-zampieri-green text-white py-12 md:py-16 border-b-[3px] border-zampieri-gold">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">Eventos do Colégio Zampieri</h2>
          <p className="text-zampieri-cream-light text-base md:text-lg max-w-2xl mx-auto">
            Confira nossos próximos eventos e garanta seu ingresso.
          </p>
        </div>
      </div>

      {/* Events list */}
      <div className="container mx-auto px-4 py-10 flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" />
          </div>
        ) : eventos.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-zampieri-green-dark">Nenhum evento disponível no momento</h3>
            <p className="text-muted-foreground mt-2">Fique de olho! Em breve teremos novidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((evento) => (
              <Card key={evento.id} className="overflow-hidden hover:shadow-xl transition-shadow border-border bg-card">
                {evento.imagem_url && (
                  <div className={`h-48 overflow-hidden relative ${evento.vagas_disponiveis <= 0 ? "opacity-50" : ""}`}>
                    <img
                      src={evento.imagem_url}
                      alt={evento.titulo}
                      className="w-full h-full object-cover"
                    />
                    {evento.vagas_disponiveis <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Badge variant="destructive" className="text-base px-4 py-1">ESGOTADO</Badge>
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="font-serif text-zampieri-green-dark">{evento.titulo}</CardTitle>
                    {evento.vagas_disponiveis <= 0 && (
                      <Badge variant="destructive">ESGOTADO</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] border-zampieri-gold/60 text-zampieri-green-dark">
                      {labelPublico(evento.publico_alvo)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {evento.descricao && (
                    <p className="text-muted-foreground text-sm line-clamp-3">{evento.descricao}</p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 text-zampieri-gold" />
                    {formatDate(evento.data_evento)}
                    {evento.horario && ` às ${evento.horario}`}
                  </div>
                  {evento.local && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 text-zampieri-gold" />
                      {evento.local}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2 text-zampieri-gold" />
                    {evento.vagas_disponiveis} vagas disponíveis
                  </div>
                  <div className="pt-2">
                    <p className="text-xl font-bold text-zampieri-green-dark">{formatPrice(evento.preco)}</p>
                    {evento.preco_parcelado > 0 && evento.max_parcelas > 1 && (
                      <p className="text-sm text-muted-foreground">
                        ou {evento.max_parcelas}x de R$ {(evento.preco_parcelado / evento.max_parcelas).toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {evento.vagas_disponiveis <= 0 ? (
                    <Button disabled className="w-full">Esgotado</Button>
                  ) : !podeComprar(evento) ? (
                    <Button disabled className="w-full">Exclusivo para alunos</Button>
                  ) : (
                    <Link to={user ? `/eventos/comprar/${evento.id}` : "/eventos/login"} className="w-full">
                      <Button className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                        <Ticket className="w-4 h-4 mr-2" />
                        Comprar Ingresso
                      </Button>
                    </Link>
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
