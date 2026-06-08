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
  preco_max: number | null;
  produto_variacoes?: Array<{ id: string; preco: number; ativo: boolean; destaque_label?: string | null }>;
}

interface UpsellConfig {
  ativo: boolean;
  titulo: string | null;
  subtitulo: string | null;
  badge: string | null;
  variacao_id: string | null;
  variacao_nome: string | null;
}

const playfair = { fontFamily: "'Playfair Display', serif" };
const lato = { fontFamily: "'Lato', sans-serif" };

const CompraSucesso = () => {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") || "ingresso";
  const eventoId = params.get("evento");
  const { user } = useAuth();
  const [eventoTitulo, setEventoTitulo] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<ProdutoSugerido[]>([]);
  const [loading, setLoading] = useState(true);
  const [upsellConfig, setUpsellConfig] = useState<UpsellConfig | null>(null);

  useEffect(() => {
    const load = async () => {
      // título do evento (se houver)
      if (eventoId) {
        const { data: ev } = await supabase
          .from("eventos")
          .select(
            "titulo, sucesso_upsell_ativo, sucesso_upsell_titulo, sucesso_upsell_subtitulo, sucesso_upsell_badge, sucesso_upsell_variacao_id"
          )
          .eq("id", eventoId)
          .maybeSingle();
        setEventoTitulo(ev?.titulo ?? null);
        if (ev) {
          let variacaoNome: string | null = null;
          const varId = (ev as any).sucesso_upsell_variacao_id ?? null;
          if (varId) {
            const { data: variacaoDestaque } = await supabase
              .from("produto_variacoes")
              .select("id, nome, preco")
              .eq("id", varId)
              .single();
            variacaoNome = (variacaoDestaque as any)?.nome ?? null;
          }
          setUpsellConfig({
            ativo: (ev as any).sucesso_upsell_ativo ?? true,
            titulo: (ev as any).sucesso_upsell_titulo ?? null,
            subtitulo: (ev as any).sucesso_upsell_subtitulo ?? null,
            badge: (ev as any).sucesso_upsell_badge ?? null,
            variacao_id: varId,
            variacao_nome: variacaoNome,
          });
        }
      } else {
        setUpsellConfig({ ativo: true, titulo: null, subtitulo: null, badge: null, variacao_id: null, variacao_nome: null });
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
        .select("id,nome,descricao,imagem_url,produto_variacoes(id,preco,ativo,destaque_label)")
        .eq("ativo", true)
        .limit(4);
      if (prodIds.length > 0) {
        query = query.in("id", prodIds);
      } else {
        query = query.eq("is_global", true);
      }
      const { data: prods } = await query;
      const list: ProdutoSugerido[] = (prods || []).map((p: any) => {
        const variacoes = (p.produto_variacoes || []).filter((v: any) => v.ativo);
        const precos = variacoes
          .map((v: any) => Number(v.preco))
          .filter((n: number) => n > 0);
        const precosDestaque = variacoes
          .filter((v: any) => v.destaque_label && String(v.destaque_label).trim() !== "")
          .map((v: any) => Number(v.preco))
          .filter((n: number) => n > 0);
        return {
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          imagem_url: p.imagem_url,
          preco_min: precos.length > 0 ? Math.min(...precos) : null,
          preco_max: precosDestaque.length > 0 ? Math.max(...precosDestaque) : (precos.length > 0 ? Math.max(...precos) : null),
          produto_variacoes: p.produto_variacoes || [],
        };
      });
      list.sort((a, b) => (b.preco_min ?? 0) - (a.preco_min ?? 0));
      setSugestoes(list);
      setLoading(false);
    };
    load();
  }, [eventoId]);

  const linkProdutos = eventoId ? `/produtos?evento=${eventoId}` : "/produtos";

  const subtituloConfirmacao =
    tipo === "produto"
      ? "Seu pedido foi recebido. A retirada é feita presencialmente no dia do evento."
      : "Em até 5 minutos seu ingresso estará disponível em Minhas compras. Apresente o QR Code na portaria.";

  const destaque = sugestoes[0];
  const secundarios = sugestoes.slice(1, 3);

  const formatPreco = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Pagamento confirmado" />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Confirmação */}
          <div
            className="text-center"
            style={{
              background: "#0F3D24",
              borderRadius: 12,
              padding: 32,
              marginBottom: 24,
            }}
          >
            <div
              className="inline-flex items-center justify-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.15)",
              }}
            >
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1
              style={{
                ...playfair,
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Ingresso garantido!
            </h1>
            <p
              style={{
                ...lato,
                fontSize: 14,
                color: "#B8D4C0",
                lineHeight: 1.6,
                marginTop: 12,
              }}
              className="max-w-xl mx-auto"
            >
              {subtituloConfirmacao}
            </p>
            {eventoTitulo && (
              <Badge className="mt-4 bg-zampieri-gold/20 text-white border border-zampieri-gold/40">
                {eventoTitulo}
              </Badge>
            )}
            <div>
              <Link to="/eventos/meus-ingressos">
                <button
                  style={{
                    border: "1.5px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    background: "transparent",
                    borderRadius: 8,
                    padding: "10px 24px",
                    marginTop: 20,
                    ...lato,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ver minhas compras
                </button>
              </Link>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-4">
              {[200, 120, 80].map((h, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: h,
                    borderRadius: 8,
                    background: "var(--color-background-secondary, hsl(var(--muted)))",
                  }}
                />
              ))}
            </div>
          )}

          {/* Upsell */}
          {!loading && upsellConfig?.ativo === true && sugestoes.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2
                style={{
                  ...playfair,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0F3D24",
                  marginTop: 8,
                }}
              >
                {upsellConfig.titulo || "Aproveite antes de ir"}
              </h2>
              <p
                style={{
                  ...lato,
                  fontSize: 14,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: 20,
                }}
              >
                {upsellConfig.subtitulo || "Produtos disponíveis para este evento."}
              </p>

              {/* Card destaque */}
              {destaque && (
                <div
                  style={{
                    background: "#0F3D24",
                    border: "2px solid #C8A014",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 12,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: 20,
                      background: "#8B1A1A",
                      color: "#ffffff",
                      fontSize: 11,
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: 20,
                      ...lato,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {upsellConfig.badge || "OFERTA DO EVENTO"}
                  </span>
                  <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
                    {destaque.imagem_url ? (
                      <img
                        src={destaque.imagem_url}
                        alt={destaque.nome}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Package className="w-8 h-8 text-zampieri-gold" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          ...playfair,
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {upsellConfig?.variacao_nome || destaque.nome}
                      </h3>
                      {destaque.descricao && (
                        <p
                          style={{
                            ...lato,
                            fontSize: 13,
                            color: "#9FD4B0",
                            marginTop: 4,
                          }}
                        >
                          {destaque.descricao.length > 100
                            ? destaque.descricao.slice(0, 100) + "..."
                            : destaque.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  {destaque.preco_min !== null && (
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          ...lato,
                          fontSize: 11,
                          color: "#9FD4B0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        A partir de
                      </div>
                      <div
                        style={{
                          ...lato,
                          fontSize: 24,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {formatPreco((() => {
                          const varId = upsellConfig?.variacao_id;
                          if (varId && destaque.produto_variacoes) {
                            const v = destaque.produto_variacoes.find((x: any) => x.id === varId);
                            if (v && Number(v.preco) > 0) return Number(v.preco);
                          }
                          return destaque.preco_max ?? destaque.preco_min ?? 0;
                        })())}
                      </div>
                    </div>
                  )}
                  <Link to={linkProdutos} style={{ display: "block" }}>
                    <button
                      style={{
                        background: "#C8A014",
                        color: "#0F3D24",
                        ...lato,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        width: "100%",
                        marginTop: 16,
                        padding: 12,
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Escolher minha cartela →
                    </button>
                  </Link>
                </div>
              )}

              {/* Cards secundários */}
              {secundarios.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {secundarios.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: "var(--color-background-primary, hsl(var(--background)))",
                        border: "0.5px solid var(--color-border-tertiary, hsl(var(--border)))",
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <h4
                        style={{
                          ...playfair,
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0F3D24",
                        }}
                      >
                        {p.nome}
                      </h4>
                      {p.preco_min !== null && (
                        <p
                          style={{
                            ...lato,
                            fontSize: 14,
                            color: "#1A6B3C",
                            fontWeight: 500,
                            marginTop: 4,
                          }}
                        >
                          A partir de {formatPreco(p.preco_min)}
                        </p>
                      )}
                      <Link to={linkProdutos}>
                        <button
                          style={{
                            border: "1px solid #0F3D24",
                            color: "#0F3D24",
                            background: "transparent",
                            width: "100%",
                            marginTop: 8,
                            padding: "8px 12px",
                            borderRadius: 8,
                            ...lato,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Ver opções
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Rodapé */}
          <div
            style={{
              textAlign: "center",
              marginTop: 32,
              paddingBottom: 16,
              fontSize: 13,
              color: "hsl(var(--muted-foreground))",
              ...lato,
            }}
          >
            Dúvidas?{" "}
            <a
              href="https://wa.me/5511939341503"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1A6B3C", fontWeight: 500 }}
            >
              Fale com a gente pelo WhatsApp
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompraSucesso;
