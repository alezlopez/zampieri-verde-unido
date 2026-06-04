import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Minus, Plus, ShoppingCart, Package } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { friendlyCheckoutError } from "@/lib/checkoutErrors";

interface Produto {
  id: string; nome: string; descricao: string | null; imagem_url: string | null;
}
interface Variacao {
  id: string; produto_id: string; nome: string;
  preco: number; preco_parcelado: number; max_parcelas: number;
  estoque_total: number | null;
  destaque_label: string | null;
  descricao: string | null;
}

const Produtos = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const eventoId = params.get("evento") || null;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variacoes, setVariacoes] = useState<Record<string, Variacao[]>>({});
  const [precoRiscado, setPrecoRiscado] = useState<Record<string, number>>({});
  const [eventoNome, setEventoNome] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<Record<string, number>>({}); // variacao_id -> qtd
  const [forma, setForma] = useState<"pix" | "credit_card">("pix");
  const [parcelas, setParcelas] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let prodIds: string[] | null = null;
      // overrides por evento: variacao_id -> { preco?, preco_parcelado? }
      const precoMap: Record<string, { preco?: number; preco_parcelado?: number }> = {};
      // filtro de variações exibidas por produto (quando vier do evento)
      const variacoesFilter: Record<string, Set<string>> = {};

      if (eventoId) {
        const { data: ep } = await supabase
          .from("evento_produtos")
          .select("produto_id, variacoes_ids, preco_override, preco_evento, preco_riscado")
          .eq("evento_id", eventoId)
          .eq("ativo", true);
        prodIds = (ep || []).map((r: any) => r.produto_id);

        const riscadoLocal: Record<string, number> = {};
        for (const row of (ep || []) as any[]) {
          if (Array.isArray(row.variacoes_ids) && row.variacoes_ids.length > 0) {
            variacoesFilter[row.produto_id] = new Set(row.variacoes_ids);
          }
          const po = row.preco_override;
          if (po && typeof po === "object" && !Array.isArray(po)) {
            for (const [vid, val] of Object.entries(po)) {
              precoMap[vid] = { ...(precoMap[vid] || {}), preco: Number(val) };
            }
          }
          const pe = row.preco_evento;
          if (pe && typeof pe === "object" && !Array.isArray(pe)) {
            for (const [vid, val] of Object.entries(pe)) {
              precoMap[vid] = { ...(precoMap[vid] || {}), preco_parcelado: Number(val) };
            }
          }
          const pr = row.preco_riscado;
          if (pr && typeof pr === "object" && !Array.isArray(pr)) {
            for (const [vid, val] of Object.entries(pr)) {
              riscadoLocal[vid] = Number(val);
            }
          }
        }
        setPrecoRiscado(riscadoLocal);

        const { data: ev } = await supabase.from("eventos").select("titulo").eq("id", eventoId).maybeSingle();
        if (ev?.titulo) setEventoNome(ev.titulo);
      }

      let prodQuery = supabase.from("produtos").select("id,nome,descricao,imagem_url").eq("ativo", true);
      if (prodIds) {
        if (prodIds.length === 0) { setProdutos([]); setLoading(false); return; }
        prodQuery = prodQuery.in("id", prodIds);
      } else {
        prodQuery = prodQuery.eq("is_global", true);
      }
      const { data: prods } = await prodQuery;
      setProdutos((prods || []) as Produto[]);
      if (prods && prods.length > 0) {
        const { data: vars } = await supabase
          .from("produto_variacoes")
          .select("*")
          .in("produto_id", prods.map((p: any) => p.id))
          .eq("ativo", true)
          .order("ordem");
        const map: Record<string, Variacao[]> = {};
        for (const raw of (vars || []) as any[]) {
          // filtra por variacoes_ids do evento (se houver)
          const allowed = variacoesFilter[raw.produto_id];
          if (allowed && !allowed.has(raw.id)) continue;

          const ov = precoMap[raw.id] || {};
          const v: Variacao = {
            id: raw.id,
            produto_id: raw.produto_id,
            nome: raw.nome,
            preco: ov.preco != null ? ov.preco : Number(raw.preco),
            preco_parcelado: ov.preco_parcelado != null ? ov.preco_parcelado : Number(raw.preco_parcelado),
            max_parcelas: raw.max_parcelas,
            estoque_total: raw.estoque_total,
            destaque_label: raw.destaque_label || null,
            descricao: raw.descricao || null,
          };
          if (!map[v.produto_id]) map[v.produto_id] = [];
          map[v.produto_id].push(v);
        }
        setVariacoes(map);
      }
      setLoading(false);
    };
    load();
  }, [eventoId]);

  const setQtd = (varId: string, delta: number) => {
    setCarrinho((prev) => {
      const cur = prev[varId] || 0;
      const nxt = Math.max(0, cur + delta);
      const out = { ...prev };
      if (nxt === 0) delete out[varId]; else out[varId] = nxt;
      return out;
    });
  };

  const itensCarrinho = Object.entries(carrinho).map(([varId, qtd]) => {
    const v = Object.values(variacoes).flat().find((x) => x.id === varId);
    return v ? { v, qtd } : null;
  }).filter(Boolean) as { v: Variacao; qtd: number }[];

  const isParcelado = forma === "credit_card" && parcelas > 1;
  const total = itensCarrinho.reduce((s, { v, qtd }) => {
    const p = isParcelado ? Number(v.preco_parcelado || v.preco) : Number(v.preco);
    return s + p * qtd;
  }, 0);
  const maxParcelasGlobal = itensCarrinho.length > 0
    ? Math.min(...itensCarrinho.map(({ v }) => v.max_parcelas || 1))
    : 1;

  const comprar = async () => {
    if (!user) {
      navigate("/eventos/login");
      return;
    }
    if (itensCarrinho.length === 0) {
      toast({ title: "Adicione itens ao carrinho", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("produtos-create-checkout", {
      body: {
        itens: itensCarrinho.map(({ v, qtd }) => ({ variacao_id: v.id, quantidade: qtd })),
        evento_id: eventoId,
        forma_pagamento: forma,
        parcelas: isParcelado ? parcelas : 1,
      },
    });
    setSubmitting(false);
    if (error || !data?.checkout_url) {
      const fe = friendlyCheckoutError((data as any)?.error || error, "Erro ao gerar checkout");
      toast({ title: fe.title, description: fe.description, variant: "destructive" });
      return;
    }
    window.location.href = data.checkout_url;
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle={eventoId ? "Produtos do evento" : "Catálogo"} />
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link to={eventoId ? `/eventos/${eventoId}` : "/eventos"} className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Link>

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-6 flex items-center gap-2">
            <Package className="w-6 h-6" /> Produtos
          </h1>

          {produtos.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum produto disponível no momento.</CardContent></Card>
          )}

          <div className="space-y-4">
            {produtos.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="w-24 h-24 object-cover rounded shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-lg text-zampieri-green-dark">{p.nome}</h3>
                      {p.descricao && <p className="text-sm text-muted-foreground whitespace-pre-line">{p.descricao}</p>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(variacoes[p.id] || []).map((v) => {
                      const qtd = carrinho[v.id] || 0;
                      return (
                        <div key={v.id} className="flex items-center justify-between gap-2 border-t pt-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{v.nome}</p>
                              {v.destaque_label && (
                                <Badge className="bg-zampieri-gold text-zampieri-green-dark text-[10px]">{v.destaque_label}</Badge>
                              )}
                            </div>
                            {v.descricao && <p className="text-xs text-muted-foreground mt-0.5">{v.descricao}</p>}
                            <p className="text-sm text-muted-foreground">
                              R$ {Number(v.preco).toFixed(2)}
                              {v.preco_parcelado > 0 && v.max_parcelas > 1 && ` · parc. R$ ${Number(v.preco_parcelado).toFixed(2)} em até ${v.max_parcelas}x`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => setQtd(v.id, -1)} disabled={qtd === 0}><Minus className="w-3 h-3" /></Button>
                            <span className="w-8 text-center font-semibold">{qtd}</span>
                            <Button size="sm" variant="outline" onClick={() => setQtd(v.id, +1)}><Plus className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {itensCarrinho.length > 0 && (
            <Card className="mt-6 border-zampieri-gold/60 sticky bottom-4">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Resumo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {itensCarrinho.map(({ v, qtd }) => (
                  <div key={v.id} className="flex justify-between text-sm">
                    <span>{qtd}× {v.nome}</span>
                    <span>R$ {(qtd * (isParcelado ? Number(v.preco_parcelado || v.preco) : Number(v.preco))).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <Label className="text-xs">Forma de pagamento</Label>
                  <RadioGroup value={forma} onValueChange={(v) => {
                    const novo = v as "pix" | "credit_card";
                    setForma(novo);
                    if (novo === "credit_card") {
                      setParcelas((p) => (p < 2 ? Math.min(2, Math.max(2, maxParcelasGlobal)) : p));
                    } else {
                      setParcelas(1);
                    }
                  }} className="flex flex-wrap gap-3 mt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="pix" id="f-pix" /><Label htmlFor="f-pix">PIX/Cartão à vista</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="credit_card" id="f-cc" /><Label htmlFor="f-cc">Cartão parcelado</Label></div>
                  </RadioGroup>
                  {forma === "credit_card" && maxParcelasGlobal > 1 && (
                    <div className="mt-2">
                      <Label className="text-xs">Parcelas (até {maxParcelasGlobal}x)</Label>
                      <Input type="number" min={1} max={maxParcelasGlobal} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Math.min(maxParcelasGlobal, Number(e.target.value) || 1)))} />
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span><span>R$ {total.toFixed(2)}</span>
                </div>
                <Button onClick={comprar} disabled={submitting} className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white" size="lg">
                  {submitting ? "Gerando checkout..." : "Comprar"}
                </Button>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-muted-foreground mt-8" style={{ fontFamily: "Lato, sans-serif", fontSize: "12px" }}>
            A retirada é feita presencialmente no dia do evento a partir das 10h. Compras online encerram às 23h59 do dia anterior.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Produtos;
