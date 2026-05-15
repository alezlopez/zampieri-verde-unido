import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Ticket, LogOut, ExternalLink, Eye, Package, QrCode, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  utilizado: boolean | null;
  utilizado_em: string | null;
  created_at: string;
  eventos: { titulo: string; data_evento: string; horario: string | null; local: string | null } | null;
}

interface PedidoProduto {
  id: string;
  produto_id: string;
  variacao_id: string;
  quantidade: number;
  valor_total: number;
  status: string;
  qr_token: string;
  checkout_url: string | null;
  retirado_em: string | null;
  created_at: string;
  produtos: { nome: string } | null;
  produto_variacoes: { nome: string } | null;
  eventos: { titulo: string; data_evento: string } | null;
}

const statusStyles: Record<string, string> = {
  pendente: "bg-zampieri-gold/20 text-zampieri-green-dark border-zampieri-gold/40",
  pago: "bg-zampieri-green/15 text-zampieri-green-dark border-zampieri-green/40",
  retirado: "bg-zampieri-green/25 text-zampieri-green-dark border-zampieri-green/60",
  cancelado: "bg-destructive/15 text-destructive border-destructive/40",
  estornado: "bg-zampieri-wine/15 text-zampieri-wine border-zampieri-wine/40",
};

const MeusIngressos = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [ingressos, setIngressos] = useState<IngressoComEvento[]>([]);
  const [pedidos, setPedidos] = useState<PedidoProduto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/eventos/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      const [{ data: ing }, { data: ped }] = await Promise.all([
        supabase
          .from("ingressos")
          .select("id, quantidade, status, nome_comprador, nome_participante, tipo_participante, checkout_url, comprovante_estorno_url, cortesia, utilizado, utilizado_em, created_at, eventos(titulo, data_evento, horario, local)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("pedidos_produtos")
          .select("id, produto_id, variacao_id, quantidade, valor_total, status, qr_token, checkout_url, retirado_em, created_at, produtos:produto_id(nome), produto_variacoes:variacao_id(nome), eventos:evento_id(titulo, data_evento)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (ing) setIngressos(ing as unknown as IngressoComEvento[]);
      if (ped) setPedidos(ped as unknown as PedidoProduto[]);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/eventos");
  };

  const [regenIngId, setRegenIngId] = useState<string | null>(null);
  const [regenPedId, setRegenPedId] = useState<string | null>(null);

  const regenerarIngresso = async (ingresso: IngressoComEvento) => {
    setRegenIngId(ingresso.id);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-create-checkout", {
        body: {
          ingresso_ids: [ingresso.id],
          forma_pagamento: "pix",
          force_regenerate: true,
        },
      });
      if (error) throw error;
      const url = (data as any)?.checkout_url;
      if (!url) throw new Error("Sem URL retornada");
      // Atualiza estado local
      setIngressos((prev) => prev.map((i) => i.id === ingresso.id ? { ...i, checkout_url: url } : i));
      window.open(url, "_blank");
      toast.success("Novo link de pagamento gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar novo link", { description: e.message || String(e) });
    } finally {
      setRegenIngId(null);
    }
  };

  const regenerarPedido = async (pedido: PedidoProduto) => {
    setRegenPedId(pedido.id);
    try {
      const { data, error } = await supabase.functions.invoke("produtos-create-checkout", {
        body: {
          pedido_ids: [pedido.id],
          forma_pagamento: "pix",
          force_regenerate: true,
        },
      });
      if (error) throw error;
      const url = (data as any)?.checkout_url;
      if (!url) throw new Error("Sem URL retornada");
      setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, checkout_url: url } : p));
      window.open(url, "_blank");
      toast.success("Novo link de pagamento gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar novo link", { description: e.message || String(e) });
    } finally {
      setRegenPedId(null);
    }
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
      <EventosHeader subtitle="Minhas compras" actions={headerActions} />

      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Link to="/eventos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Eventos
          </Link>

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-6 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-zampieri-gold" />
            Minhas compras
          </h1>

          <Tabs defaultValue="ingressos" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="ingressos" className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4" /> Ingressos
                {ingressos.length > 0 && <Badge variant="secondary" className="ml-1">{ingressos.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="produtos" className="flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Produtos
                {pedidos.length > 0 && <Badge variant="secondary" className="ml-1">{pedidos.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ingressos" className="mt-4">
              {ingressos.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Você ainda não comprou nenhum ingresso.</p>
                  <Link to="/eventos">
                    <Button className="mt-4 bg-zampieri-green-dark hover:bg-zampieri-green text-white">Ver eventos</Button>
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
                          <Badge className={`border ${ingresso.utilizado ? "bg-zampieri-green/25 text-zampieri-green-dark border-zampieri-green/60" : statusStyles[ingresso.status] || ""} capitalize`}>
                            {ingresso.utilizado ? "Utilizado" : ingresso.cortesia ? "Cortesia" : ingresso.status}
                          </Badge>
                        </div>
                        {ingresso.utilizado && ingresso.utilizado_em && (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-zampieri-green/40 bg-zampieri-green/10 p-2">
                            <CheckCircle2 className="w-4 h-4 text-zampieri-green-dark" />
                            <p className="text-xs text-zampieri-green-dark font-medium">
                              Utilizado em {new Date(ingresso.utilizado_em).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        )}
                        {ingresso.status === "pago" && !ingresso.utilizado && (
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
                        {ingresso.status === "pendente" && (
                          <div className="mt-3 space-y-2">
                            {ingresso.checkout_url && (
                              <Button
                                size="sm"
                                className="bg-zampieri-gold hover:bg-zampieri-gold-light text-zampieri-green-dark w-full"
                                onClick={() => window.open(ingresso.checkout_url!, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Pagar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-zampieri-green/40 text-zampieri-green-dark hover:bg-zampieri-cream"
                              disabled={regenIngId === ingresso.id}
                              onClick={() => regenerarIngresso(ingresso)}
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${regenIngId === ingresso.id ? "animate-spin" : ""}`} />
                              {ingresso.checkout_url ? "Gerar novo link" : "Gerar link de pagamento"}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              ⏱ Reserva válida até{" "}
                              <strong>
                                {new Date(new Date(ingresso.created_at).getTime() + 60 * 60 * 1000).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                              </strong>
                              . Se o link não abrir, gere um novo.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="produtos" className="mt-4">
              {pedidos.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-14 h-14 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Você ainda não comprou nenhum produto.</p>
                  <Link to="/produtos">
                    <Button className="mt-4 bg-zampieri-green-dark hover:bg-zampieri-green text-white">Ver produtos</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {pedidos.map((p) => (
                    <Card key={p.id} className="border-border bg-card">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h3 className="font-serif font-semibold text-zampieri-green-dark truncate">
                              {p.produtos?.nome || "Produto"}
                            </h3>
                            <p className="text-sm text-muted-foreground">{p.produto_variacoes?.nome}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {p.quantidade}× · R$ {Number(p.valor_total).toFixed(2).replace(".", ",")}
                            </p>
                            {p.eventos?.titulo && (
                              <p className="text-xs text-zampieri-green-dark mt-1">
                                Evento: {p.eventos.titulo}
                              </p>
                            )}
                          </div>
                          <Badge className={`border ${statusStyles[p.status] || ""} capitalize`}>
                            {p.status === "retirado" ? (
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Retirado</span>
                            ) : p.status}
                          </Badge>
                        </div>

                        {p.retirado_em && (
                          <p className="text-xs text-zampieri-green-dark mt-2">
                            Retirado em {new Date(p.retirado_em).toLocaleString("pt-BR")}
                          </p>
                        )}

                        {(p.status === "pago" || p.status === "retirado") && (
                          <div className="mt-3">
                            <Link to={`/comprovante/${p.qr_token}`}>
                              <Button size="sm" className="bg-zampieri-green-dark hover:bg-zampieri-green text-white w-full">
                                <QrCode className="w-4 h-4 mr-2" />
                                Ver comprovante
                              </Button>
                            </Link>
                          </div>
                        )}
                        {p.status === "pendente" && (
                          <div className="mt-3 space-y-2">
                            {p.checkout_url && (
                              <Button
                                size="sm"
                                className="bg-zampieri-gold hover:bg-zampieri-gold-light text-zampieri-green-dark w-full"
                                onClick={() => window.open(p.checkout_url!, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Pagar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-zampieri-green/40 text-zampieri-green-dark hover:bg-zampieri-cream"
                              disabled={regenPedId === p.id}
                              onClick={() => regenerarPedido(p)}
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${regenPedId === p.id ? "animate-spin" : ""}`} />
                              {p.checkout_url ? "Gerar novo link" : "Gerar link de pagamento"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MeusIngressos;
