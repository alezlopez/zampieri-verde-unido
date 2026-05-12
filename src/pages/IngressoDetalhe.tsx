import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Share2, Ticket, Clock, AlertTriangle, Info, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface IngressoCompleto {
  id: string;
  quantidade: number;
  status: string;
  nome_comprador: string;
  nome_participante: string | null;
  tipo_participante: string;
  comprovante_estorno_url: string | null;
  created_at: string;
  eventos: {
    titulo: string;
    data_evento: string;
    horario: string | null;
    local: string | null;
    is_excursao: boolean;
  } | null;
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex flex-col">
    <EventosHeader subtitle="Detalhe do ingresso" />
    <div className="flex-1 py-8 px-4">{children}</div>
    <Footer />
  </div>
);

const IngressoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ingresso, setIngresso] = useState<IngressoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/eventos/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !id) return;
      const { data } = await supabase
        .from("ingressos")
        .select("id, quantidade, status, nome_comprador, nome_participante, tipo_participante, comprovante_estorno_url, created_at, eventos(titulo, data_evento, horario, local, is_excursao)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) setIngresso(data as unknown as IngressoCompleto);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `ingresso-${ingresso?.eventos?.titulo || "evento"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast({ title: "Erro ao salvar imagem", variant: "destructive" });
    }
  }, [ingresso]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Ingresso - ${ingresso?.eventos?.titulo}`, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    }
  }, [ingresso]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" />
      </div>
    );
  }

  if (!ingresso) {
    return (
      <Shell>
        <div className="container mx-auto max-w-md text-center">
          <p className="text-muted-foreground mb-4">Ingresso não encontrado.</p>
          <Link to="/eventos/meus-ingressos">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (ingresso.status === "estornado") {
    return (
      <Shell>
        <div className="container mx-auto max-w-md text-center">
          <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Meus Ingressos
          </Link>
          <div className="bg-card border border-border rounded-2xl shadow-lg p-8 mt-4">
            <RotateCcw className="w-16 h-16 text-zampieri-wine mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold text-zampieri-green-dark mb-2">Ingresso Estornado</h2>
            <p className="text-muted-foreground mb-4">
              Este ingresso foi estornado e não é mais válido.
            </p>
            {ingresso.comprovante_estorno_url && (
              <Button
                className="bg-zampieri-wine hover:bg-zampieri-wine/90 text-white"
                onClick={() => window.open(ingresso.comprovante_estorno_url!, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Comprovante de Estorno
              </Button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  if (ingresso.status !== "pago") {
    return (
      <Shell>
        <div className="container mx-auto max-w-md text-center">
          <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Meus Ingressos
          </Link>
          <div className="bg-card border border-border rounded-2xl shadow-lg p-8 mt-4">
            <Clock className="w-16 h-16 text-zampieri-gold mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold text-zampieri-green-dark mb-2">Pagamento Pendente</h2>
            <p className="text-muted-foreground">
              Seu ingresso ainda não foi confirmado. Após o pagamento ser processado, o ingresso aparecerá aqui.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  const evento = ingresso.eventos;
  const dataFormatada = evento?.data_evento
    ? new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Shell>
      <div className="container mx-auto max-w-md">
        <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" />Meus Ingressos
        </Link>

        {/* Ticket card */}
        <div ref={cardRef} className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border mt-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-zampieri-green-dark to-zampieri-green px-6 py-5 text-white border-b-[3px] border-zampieri-gold">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-zampieri-gold" />
                <span className="text-sm font-semibold tracking-wider opacity-90">INGRESSO</span>
              </div>
              <Badge className="bg-zampieri-gold text-zampieri-green-dark hover:bg-zampieri-gold font-bold text-xs">
                ✓ PAGO
              </Badge>
            </div>
            <h1 className="font-serif text-xl md:text-2xl font-bold mt-3">{evento?.titulo}</h1>
          </div>

          {/* Dashed separator */}
          <div className="relative">
            <div className="absolute -left-3 -top-3 w-6 h-6 bg-background rounded-full" />
            <div className="absolute -right-3 -top-3 w-6 h-6 bg-background rounded-full" />
            <div className="border-t-2 border-dashed border-zampieri-gold/40 mx-6" />
          </div>

          {/* Info */}
          <div className="px-6 py-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Data</p>
              <p className="font-medium text-foreground capitalize">{dataFormatada}</p>
              {evento?.horario && <p className="text-sm text-muted-foreground">às {evento.horario}</p>}
            </div>
            {evento?.local && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Local</p>
                <p className="font-medium text-foreground">{evento.local}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Participante</p>
              <p className="font-medium text-foreground">
                {ingresso.nome_participante || ingresso.nome_comprador}
              </p>
              {ingresso.tipo_participante === "convidado" && (
                <span className="text-xs text-zampieri-wine font-medium">(convidado)</span>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center pb-6 px-6">
            <div className="bg-white rounded-xl p-4 border-2 border-zampieri-gold/40">
              <QRCodeSVG value={ingresso.id} size={180} level="H" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">{ingresso.id.slice(0, 8).toUpperCase()}</p>

            {/* Observação condicional */}
            {evento?.is_excursao ? (
              <div className="mt-4 w-full bg-zampieri-cream border-2 border-zampieri-gold rounded-lg p-4 flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-zampieri-gold shrink-0 mt-0.5" />
                <p className="text-sm text-zampieri-green-dark font-semibold leading-relaxed">
                  Este QR Code <span className="underline">não é válido</span> para entrada no local da excursão. Deve ser apresentado na escola para efetivo controle do participante. O ingresso para entrada no evento será entregue pela escola no local do evento.
                </p>
              </div>
            ) : (
              <div className="mt-4 w-full bg-zampieri-cream border-2 border-zampieri-green/40 rounded-lg p-4 flex gap-3 items-start">
                <Info className="w-6 h-6 text-zampieri-green shrink-0 mt-0.5" />
                <p className="text-sm text-zampieri-green-dark font-semibold leading-relaxed">
                  Obrigatória a apresentação deste ingresso na entrada do evento.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleSaveImage} className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green text-white">
            <Download className="w-4 h-4 mr-2" />Salvar Imagem
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1 border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
            <Share2 className="w-4 h-4 mr-2" />Compartilhar
          </Button>
        </div>
      </div>
    </Shell>
  );
};

export default IngressoDetalhe;
