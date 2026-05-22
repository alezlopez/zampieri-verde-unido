import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, MapPin, Users, Ticket, ArrowLeft, LogOut, Package, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  aluno_cortesia?: boolean;
  meia_entrada_habilitada?: boolean;
  preco_meia?: number;
  preco_meia_parcelado?: number;
  percentual_meia?: number;
}

const labelPublico = (p: Evento["publico_alvo"]) =>
  p === "aberto_ao_publico" ? "Aberto ao público" :
  p === "apenas_alunos" ? "Apenas alunos" : "Alunos e convidados";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const formatPrice = (price: number) =>
  price === 0 ? "Gratuito" : `R$ ${price.toFixed(2).replace(".", ",")}`;

const EventoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoComprador, setTipoComprador] = useState<"aluno" | "externo" | null>(null);
  const [produtosExtras, setProdutosExtras] = useState<Array<{ id: string; nome: string; descricao: string | null; imagem_url: string | null; preco_min: number | null }>>([]);

  useEffect(() => {
    if (!id) return;
    const fetchEvento = async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .eq("ativo", true)
        .maybeSingle();
      setEvento((data as any) ?? null);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadProdutos = async () => {
      const { data: ep } = await supabase
        .from("evento_produtos")
        .select("produto_id")
        .eq("evento_id", id)
        .eq("ativo", true);
      const prodIds = (ep || []).map((r: any) => r.produto_id);
      if (prodIds.length === 0) { setProdutosExtras([]); return; }
      const { data: prods } = await supabase
        .from("produtos")
        .select("id,nome,descricao,imagem_url,produto_variacoes(preco,ativo)")
        .in("id", prodIds)
        .eq("ativo", true);
      const list = (prods || []).map((p: any) => {
        const precos = (p.produto_variacoes || [])
          .filter((v: any) => v.ativo)
          .map((v: any) => Number(v.preco))
          .filter((n: number) => n > 0);
        return {
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          imagem_url: p.imagem_url,
          preco_min: precos.length > 0 ? Math.min(...precos) : null,
        };
      });
      setProdutosExtras(list);
    };
    loadProdutos();
  }, [id]);

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

  useEffect(() => {
    if (evento) {
      document.title = `${evento.titulo} · Colégio Zampieri`;
      const desc = (evento.descricao || "Compre seu ingresso para o evento do Colégio Zampieri.").slice(0, 155);
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", desc);
    }
  }, [evento]);

  const podeComprar = (e: Evento) => {
    if (e.publico_alvo === "aberto_ao_publico") return true;
    if (e.publico_alvo === "alunos_e_convidados") return true;
    if (!user) return true;
    if (tipoComprador === "aluno") return true;
    return false;
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

  const handleComprar = () => {
    if (!evento) return;
    if (!user) {
      navigate("/eventos/login", { state: { redirectTo: `/eventos/comprar/${evento.id}` } });
      return;
    }
    navigate(`/eventos/comprar/${evento.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Eventos · Detalhes" actions={headerActions} />

      <main className="flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" />
          </div>
        ) : !evento ? (
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="font-serif text-2xl text-zampieri-green-dark mb-4">Evento não encontrado</h1>
            <Link to="/eventos">
              <Button className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para eventos
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {evento.imagem_url && (
              <div className="w-full bg-zampieri-cream">
                <div className="container mx-auto px-4 py-6">
                  <img
                    src={evento.imagem_url}
                    alt={evento.titulo}
                    className="w-full max-h-[420px] object-cover rounded-lg shadow-lg"
                  />
                </div>
              </div>
            )}

            <article className="container mx-auto px-4 py-8 max-w-4xl">
              <Link to="/eventos" className="inline-flex items-center text-sm text-zampieri-green-dark hover:underline mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para eventos
              </Link>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="border-zampieri-gold/60 text-zampieri-green-dark">
                  {labelPublico(evento.publico_alvo)}
                </Badge>
                {evento.aluno_cortesia && (
                  <Badge className="bg-zampieri-gold/20 text-zampieri-green-dark border-zampieri-gold/60">
                    Aluno cortesia
                  </Badge>
                )}
                {evento.requer_autorizacao && (
                  <Badge variant="outline" className="border-zampieri-wine/60 text-zampieri-wine">
                    Requer autorização
                  </Badge>
                )}
                {evento.vagas_disponiveis <= 0 && (
                  <Badge variant="destructive">ESGOTADO</Badge>
                )}
              </div>

              <h1 className="font-serif text-3xl md:text-4xl font-bold text-zampieri-green-dark mb-4">
                {evento.titulo}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-6">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-zampieri-gold" />
                  {formatDate(evento.data_evento)}
                  {evento.horario && ` às ${evento.horario}`}
                </div>
                {evento.local && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-zampieri-gold" />
                    {evento.local}
                  </div>
                )}
              </div>

              <div className="bg-zampieri-cream/50 rounded-lg p-5 mb-6 border border-zampieri-gold/30">
                <p className="text-3xl font-bold text-zampieri-green-dark">
                  {formatPrice(evento.preco)}
                </p>
                {evento.preco_parcelado > 0 && evento.max_parcelas > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou {evento.max_parcelas}x de R$ {(evento.preco_parcelado / evento.max_parcelas).toFixed(2).replace(".", ",")}
                  </p>
                )}
                {evento.meia_entrada_habilitada && (evento.preco_meia ?? 0) > 0 && (
                  <p className="text-sm text-zampieri-green-dark mt-2">
                    Meia-entrada: R$ {(evento.preco_meia ?? 0).toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>

              {evento.descricao && (
                <section className="mb-8">
                  <h2 className="font-serif text-xl font-semibold text-zampieri-green-dark mb-3">
                    Sobre o evento
                  </h2>
                  <p className="text-foreground/90 whitespace-pre-line leading-relaxed">
                    {evento.descricao}
                  </p>
                </section>
              )}

              <div className="sticky bottom-4 z-10 space-y-2">
                {evento.vagas_disponiveis <= 0 ? (
                  <Button disabled size="lg" className="w-full">Esgotado</Button>
                ) : !podeComprar(evento) ? (
                  <Button disabled size="lg" className="w-full">Exclusivo para alunos</Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={handleComprar}
                      className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white shadow-lg"
                    >
                      <Ticket className="w-5 h-5 mr-2" />
                      {user ? "Comprar Ingresso" : "Entrar para comprar"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      ⏱ A reserva fica válida por <strong>60 minutos</strong> para conclusão do pagamento.
                    </p>
                  </>
                )}
              </div>

              {produtosExtras.length > 0 && (
                <section className="mt-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-zampieri-gold" />
                    <h2 className="font-serif text-xl font-semibold text-zampieri-green-dark">
                      Produtos extras deste evento
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {produtosExtras.map((p) => (
                      <Card key={p.id} className="border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex gap-3">
                          <div className="shrink-0">
                            {p.imagem_url ? (
                              <img src={p.imagem_url} alt={p.nome} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-16 rounded bg-zampieri-cream flex items-center justify-center">
                                <Package className="w-7 h-7 text-zampieri-gold" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-bold text-zampieri-green-dark line-clamp-1">{p.nome}</h3>
                            {p.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.descricao}</p>
                            )}
                            {p.preco_min !== null && (
                              <p className="text-sm font-bold text-zampieri-green-dark mt-1">
                                a partir de R$ {p.preco_min.toFixed(2).replace(".", ",")}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <Link to={`/eventos/${evento.id}/produtos`}>
                      <Button variant="outline" className="border-zampieri-gold text-zampieri-green-dark hover:bg-zampieri-cream">
                        Comprar produtos
                      </Button>
                    </Link>
                  </div>
                </section>
              )}
            </article>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventoDetalhe;
