import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShoppingBag, Sparkles, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface ProdutoSugerido {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  preco_min: number | null;
}

const CompraSucesso = () => {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") || "ingresso";
  const eventoId = params.get("evento");
  const { user } = useAuth();
  const [eventoTitulo, setEventoTitulo] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<ProdutoSugerido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // título do evento (se houver)
      if (eventoId) {
        const { data: ev } = await supabase
          .from("eventos")
          .select("titulo")
          .eq("id", eventoId)
          .maybeSingle();
        setEventoTitulo(ev?.titulo ?? null);
      }

      // sugestões: produtos vinculados ao evento OU globais (até 4)
      let prodIds: string[] = [];
      if (eventoId) {
        const { data: ep } = await supabase
          .from("evento_produtos")
          .select("produto_id")
          .eq("evento_id", eventoId)
          .eq("ativo", true);
        prodIds = (ep || []).map((r: any) => r.produto_id);
      }

      let query = supabase
        .from("produtos")
        .select("id,nome,descricao,imagem_url,produto_variacoes(preco,ativo)")
        .eq("ativo", true)
        .limit(4);
      if (prodIds.length > 0) {
        query = query.in("id", prodIds);
      } else {
        query = query.eq("is_global", true);
      }
      const { data: prods } = await query;
      const list: ProdutoSugerido[] = (prods || []).map((p: any) => {
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
      setSugestoes(list);
      setLoading(false);
    };
    load();
  }, [eventoId]);

  const linkProdutos = eventoId ? `/eventos/${eventoId}/produtos` : "/produtos";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Pagamento confirmado" />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Confirmação */}
          <Card className="border-zampieri-green/40 bg-gradient-to-br from-zampieri-green/5 to-zampieri-cream/40 mb-6">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zampieri-green-dark/10 mb-4">
                <CheckCircle2 className="w-10 h-10 text-zampieri-green-dark" />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-2">
                Recebemos seu pedido!
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {tipo === "produto"
                  ? "Em até 5 minutos seu comprovante estará liberado em Minhas compras com o QR Code para retirada no dia."
                  : "Em até 5 minutos seu ingresso estará disponível em Minhas compras. Apresente o QR Code na portaria."}
              </p>
              {eventoTitulo && (
                <Badge className="mt-4 bg-zampieri-gold/20 text-zampieri-green-dark border border-zampieri-gold/40">
                  {eventoTitulo}
                </Badge>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link to="/eventos/meus-ingressos">
                  <Button size="lg" className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Ir para Minhas compras
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upsell */}
          {!loading && sugestoes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-zampieri-gold" />
                <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">
                  {eventoId ? "Adicione ao seu evento" : "Você também pode gostar"}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sugestoes.map((p) => (
                  <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow border-border">
                    <CardContent className="p-4 flex gap-4">
                      <div className="shrink-0">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.nome} className="w-20 h-20 object-cover rounded" />
                        ) : (
                          <div className="w-20 h-20 rounded bg-zampieri-cream flex items-center justify-center">
                            <Package className="w-8 h-8 text-zampieri-gold" />
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

              <div className="mt-5 text-center">
                <Link to={linkProdutos}>
                  <Button size="lg" variant="outline" className="border-zampieri-gold text-zampieri-green-dark hover:bg-zampieri-cream">
                    Ver produtos disponíveis
                  </Button>
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompraSucesso;
