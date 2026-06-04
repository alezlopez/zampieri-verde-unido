import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Minus, Plus, Clock } from "lucide-react";
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

const PLAYFAIR = "'Playfair Display', serif";
const LATO = "'Lato', sans-serif";

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

  // ===== Classificação de variações =====
  const allVars = produtos.flatMap((p) =>
    (variacoes[p.id] || []).map((v) => ({ v, produto: p }))
  );
  const isOferta = (nome: string) => /leve|extra/i.test(nome);
  const isMelhorValor = (nome: string) => /20\s*%\s*off|todas as rodadas/i.test(nome);

  const ofertas = allVars.filter((x) => isOferta(x.v.nome));
  const restantes = allVars.filter((x) => !isOferta(x.v.nome));

  const melhorValor = restantes.find((x) => isMelhorValor(x.v.nome)) || null;
  const semMelhor = restantes.filter((x) => x !== melhorValor);

  const comDestaque = semMelhor.filter((x) => x.v.destaque_label);
  const destaquePrincipal = comDestaque.length > 0
    ? comDestaque.reduce((max, x) => (Number(x.v.preco) > Number(max.v.preco) ? x : max))
    : null;

  const secundarios = semMelhor.filter((x) => x !== destaquePrincipal);

  const fmt = (n: number) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

  // ===== Sub-componentes inline =====
  const PrecoBloco = ({ v, light }: { v: Variacao; light?: boolean }) => {
    const riscado = precoRiscado[v.id];
    const labelColor = light ? "#9FD4B0" : "#0F3D24";
    return (
      <div className="flex items-end justify-between gap-3 mt-2">
        <div>
          <div
            style={{
              fontFamily: LATO,
              fontSize: 11,
              color: labelColor,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            Online até 19/06
          </div>
          <div
            style={{
              fontFamily: LATO,
              fontSize: 28,
              fontWeight: 700,
              color: light ? "#FFFFFF" : "#0F3D24",
              lineHeight: 1.1,
            }}
          >
            {fmt(v.preco)}
          </div>
        </div>
        {riscado != null && (
          <div className="text-right">
            <div
              style={{
                fontFamily: LATO,
                fontSize: 11,
                color: labelColor,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              No evento
            </div>
            <div
              style={{
                fontFamily: LATO,
                fontSize: 16,
                color: "#F09595",
                textDecoration: "line-through",
                fontWeight: 600,
              }}
            >
              {fmt(riscado)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Controles = ({ v }: { v: Variacao }) => {
    const qtd = carrinho[v.id] || 0;
    return (
      <div className="flex items-center justify-center gap-3 mt-3">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full"
          onClick={() => setQtd(v.id, -1)}
          disabled={qtd === 0}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-10 text-center font-bold text-base" style={{ fontFamily: LATO }}>{qtd}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full"
          onClick={() => setQtd(v.id, +1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  const CardDestaque = ({ x }: { x: { v: Variacao; produto: Produto } }) => {
    const { v } = x;
    return (
      <div
        style={{
          background: "#0F3D24",
          border: "2px solid #C8A014",
          borderRadius: 12,
          padding: 20,
          position: "relative",
          marginBottom: 12,
        }}
      >
        {v.destaque_label && (
          <span
            style={{
              position: "absolute",
              top: -10,
              left: 20,
              background: "#C8A014",
              color: "#0F3D24",
              fontSize: 11,
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 20,
              fontFamily: LATO,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            {v.destaque_label}
          </span>
        )}
        <h3 style={{ fontFamily: PLAYFAIR, fontSize: 20, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
          {v.nome}
        </h3>
        {v.descricao && (
          <p style={{ fontFamily: LATO, fontSize: 13, color: "#C8A014", marginTop: 4, marginBottom: 0 }}>
            {v.descricao}
          </p>
        )}
        <PrecoBloco v={v} light />
        <Controles v={v} />
        <Button
          onClick={() => setQtd(v.id, +1)}
          style={{
            background: "#C8A014",
            color: "#0F3D24",
            fontFamily: LATO,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            width: "100%",
            marginTop: 16,
            border: "none",
          }}
        >
          Adicionar ao carrinho
        </Button>
      </div>
    );
  };

  const CardMelhorValor = ({ x }: { x: { v: Variacao; produto: Produto } }) => {
    const { v } = x;
    return (
      <div
        style={{
          background: "#1A6B3C",
          borderRadius: 12,
          padding: 20,
          position: "relative",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: -10,
            left: 20,
            background: "#FFFFFF",
            color: "#1A6B3C",
            fontSize: 11,
            textTransform: "uppercase",
            padding: "4px 12px",
            borderRadius: 20,
            fontFamily: LATO,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          Melhor custo-benefício
        </span>
        <h3 style={{ fontFamily: PLAYFAIR, fontSize: 18, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
          {v.nome}
        </h3>
        {v.descricao && (
          <p style={{ fontFamily: LATO, fontSize: 13, color: "#9FD4B0", marginTop: 4, marginBottom: 0 }}>
            {v.descricao}
          </p>
        )}
        <PrecoBloco v={v} light />
        <Controles v={v} />
        <Button
          onClick={() => setQtd(v.id, +1)}
          style={{
            background: "transparent",
            color: "#FFFFFF",
            fontFamily: LATO,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            width: "100%",
            marginTop: 16,
            border: "1.5px solid rgba(255,255,255,0.5)",
          }}
        >
          Adicionar ao carrinho
        </Button>
      </div>
    );
  };

  const CardSecundario = ({ x }: { x: { v: Variacao; produto: Produto } }) => {
    const { v } = x;
    const riscado = precoRiscado[v.id];
    return (
      <div
        style={{
          background: "hsl(var(--background))",
          border: "0.5px solid hsl(var(--border))",
          borderRadius: 10,
          padding: 14,
        }}
      >
        {v.destaque_label && (
          <span
            style={{
              display: "inline-block",
              background: "#1A6B3C",
              color: "#FFFFFF",
              fontSize: 11,
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 10,
              fontFamily: LATO,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            {v.destaque_label}
          </span>
        )}
        <h4 style={{ fontFamily: PLAYFAIR, fontSize: 15, fontWeight: 700, color: "#0F3D24", margin: 0 }}>
          {v.nome}
        </h4>
        {v.descricao && (
          <p style={{ fontFamily: LATO, fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2, marginBottom: 0 }}>
            {v.descricao}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-2">
          <span style={{ fontFamily: LATO, fontSize: 18, fontWeight: 700, color: "#0F3D24" }}>
            {fmt(v.preco)}
          </span>
          {riscado != null && (
            <span style={{ fontFamily: LATO, fontSize: 12, color: "#E24B4A", textDecoration: "line-through" }}>
              {fmt(riscado)}
            </span>
          )}
        </div>
        <Controles v={v} />
        <Button
          onClick={() => setQtd(v.id, +1)}
          style={{
            background: "#0F3D24",
            color: "#FFFFFF",
            fontFamily: LATO,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            width: "100%",
            marginTop: 10,
            border: "none",
          }}
        >
          Adicionar
        </Button>
      </div>
    );
  };

  const OfertaRow = ({ x }: { x: { v: Variacao; produto: Produto } }) => {
    const { v } = x;
    const qtd = carrinho[v.id] || 0;
    return (
      <div
        style={{
          background: "hsl(var(--muted))",
          border: "0.5px solid hsl(var(--border))",
          borderRadius: 10,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: LATO, fontWeight: 700, color: "#0F3D24", fontSize: 14 }}>
            {v.nome}
          </div>
          {v.descricao && (
            <div style={{ fontFamily: LATO, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
              {v.descricao}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span style={{ fontFamily: LATO, fontSize: 16, fontWeight: 700, color: "#0F3D24" }}>
            {fmt(v.preco)}
          </span>
          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => setQtd(v.id, -1)} disabled={qtd === 0}>
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-6 text-center font-bold text-sm">{qtd}</span>
          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => setQtd(v.id, +1)}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        fontFamily: LATO,
        fontSize: 11,
        textTransform: "uppercase",
        color: "#1A6B3C",
        letterSpacing: "0.12em",
        fontWeight: 700,
        marginBottom: 6,
        marginTop: 24,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle={eventoId ? "Produtos do evento" : "Catálogo"} />
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link to={eventoId ? `/eventos/${eventoId}` : "/eventos"} className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Link>

          {/* Header da página */}
          <div
            style={{
              background: "#0F3D24",
              borderRadius: 12,
              padding: "24px 28px",
              marginBottom: 24,
            }}
          >
            <h1 style={{ fontFamily: PLAYFAIR, fontSize: 22, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
              {eventoNome || "Produtos"}
            </h1>
            <div
              style={{
                fontFamily: LATO,
                fontSize: 13,
                color: "#B8D4C0",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: 4,
              }}
            >
              Colégio Zampieri
            </div>
            {eventoId && (
              <div
                style={{
                  background: "#8B1A1A",
                  borderRadius: 8,
                  padding: "10px 16px",
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#FFFFFF",
                  fontFamily: LATO,
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Compra online encerra <strong style={{ color: "#F5C842", fontWeight: 700 }}>19/06</strong>. No dia do evento o valor é maior e somente presencial.
                </span>
              </div>
            )}
          </div>

          {produtos.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum produto disponível no momento.</CardContent></Card>
          )}

          {/* DESTAQUE */}
          {(destaquePrincipal || melhorValor) && (
            <>
              <SectionLabel>DESTAQUE</SectionLabel>
              {destaquePrincipal && <CardDestaque x={destaquePrincipal} />}
              {melhorValor && <CardMelhorValor x={melhorValor} />}
            </>
          )}

          {/* OUTRAS OPÇÕES */}
          {secundarios.length > 0 && (
            <>
              <SectionLabel>OUTRAS OPÇÕES</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {secundarios.map((x) => (
                  <CardSecundario key={x.v.id} x={x} />
                ))}
              </div>
            </>
          )}

          {/* OFERTAS ESPECIAIS */}
          {ofertas.length > 0 && (
            <>
              <SectionLabel>OFERTAS ESPECIAIS</SectionLabel>
              {ofertas.map((x) => (
                <OfertaRow key={x.v.id} x={x} />
              ))}
            </>
          )}

          {/* Resumo do carrinho */}
          {itensCarrinho.length > 0 && (
            <div
              className="sticky bottom-4 mt-6"
              style={{
                background: "#0F3D24",
                color: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontFamily: PLAYFAIR, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                Resumo
              </div>
              <div className="space-y-2">
                {itensCarrinho.map(({ v, qtd }) => (
                  <div
                    key={v.id}
                    className="flex justify-between text-sm"
                    style={{ fontFamily: LATO }}
                  >
                    <span>{qtd}× {v.nome}</span>
                    <span>{fmt(qtd * (isParcelado ? Number(v.preco_parcelado || v.preco) : Number(v.preco)))}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12, marginTop: 12 }}>
                  <Label className="text-xs" style={{ color: "#B8D4C0" }}>Forma de pagamento</Label>
                  <RadioGroup value={forma} onValueChange={(v) => {
                    const novo = v as "pix" | "credit_card";
                    setForma(novo);
                    if (novo === "credit_card") {
                      setParcelas((p) => (p < 2 ? Math.min(2, Math.max(2, maxParcelasGlobal)) : p));
                    } else {
                      setParcelas(1);
                    }
                  }} className="flex flex-wrap gap-3 mt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="pix" id="f-pix" className="border-white text-white" /><Label htmlFor="f-pix" style={{ color: "#FFFFFF" }}>PIX/Cartão à vista</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="credit_card" id="f-cc" className="border-white text-white" /><Label htmlFor="f-cc" style={{ color: "#FFFFFF" }}>Cartão parcelado</Label></div>
                  </RadioGroup>
                  {forma === "credit_card" && maxParcelasGlobal > 1 && (
                    <div className="mt-2">
                      <Label className="text-xs" style={{ color: "#B8D4C0" }}>Parcelas (até {maxParcelasGlobal}x)</Label>
                      <Input type="number" min={1} max={maxParcelasGlobal} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Math.min(maxParcelasGlobal, Number(e.target.value) || 1)))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}
                </div>
                <div
                  className="flex justify-between font-bold text-lg pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 12, fontFamily: LATO }}
                >
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
                <Button
                  onClick={comprar}
                  disabled={submitting}
                  style={{
                    background: "#C8A014",
                    color: "#0F3D24",
                    fontFamily: LATO,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    width: "100%",
                    marginTop: 12,
                    border: "none",
                  }}
                  size="lg"
                >
                  {submitting ? "Gerando checkout..." : "Comprar"}
                </Button>
              </div>
            </div>
          )}

          <p
            style={{
              fontFamily: LATO,
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              textAlign: "center",
              marginTop: 24,
              lineHeight: 1.5,
            }}
          >
            A retirada é feita presencialmente no dia do evento a partir das 10h.<br />
            Compras online encerram às 23h59 do dia anterior.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Produtos;
