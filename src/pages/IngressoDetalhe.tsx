import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Share2, Ticket, Clock, AlertTriangle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IngressoCompleto {
  id: string;
  quantidade: number;
  status: string;
  nome_comprador: string;
  nome_participante: string | null;
  tipo_participante: string;
  created_at: string;
  eventos: {
    titulo: string;
    data_evento: string;
    horario: string | null;
    local: string | null;
    is_excursao: boolean;
  } | null;
}

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
        .select("id, quantidade, status, nome_comprador, nome_participante, tipo_participante, created_at, eventos(titulo, data_evento, horario, local, is_excursao)")
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!ingresso) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">Ingresso não encontrado.</p>
        <Link to="/eventos/meus-ingressos">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </Link>
      </div>
    );
  }

  if (ingresso.status !== "pago") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
        <div className="container mx-auto max-w-md text-center">
          <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-green-700 hover:text-green-800 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />Meus Ingressos
          </Link>
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-4">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pagamento Pendente</h2>
            <p className="text-muted-foreground">
              Seu ingresso ainda não foi confirmado. Após o pagamento ser processado, o ingresso aparecerá aqui.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const evento = ingresso.eventos;
  const dataFormatada = evento?.data_evento
    ? new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="container mx-auto max-w-md">
        <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-green-700 hover:text-green-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Meus Ingressos
        </Link>

        {/* Ticket card */}
        <div ref={cardRef} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100 mt-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">INGRESSO</span>
              </div>
              <Badge className="bg-white text-green-700 hover:bg-white font-bold text-xs">
                ✓ PAGO
              </Badge>
            </div>
            <h1 className="text-xl font-bold mt-3">{evento?.titulo}</h1>
          </div>

          {/* Dashed separator */}
          <div className="relative">
            <div className="absolute -left-3 -top-3 w-6 h-6 bg-green-50 rounded-full" />
            <div className="absolute -right-3 -top-3 w-6 h-6 bg-green-50 rounded-full" />
            <div className="border-t-2 border-dashed border-green-200 mx-6" />
          </div>

          {/* Info */}
          <div className="px-6 py-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Data</p>
              <p className="font-medium text-gray-800 capitalize">{dataFormatada}</p>
              {evento?.horario && <p className="text-sm text-gray-600">às {evento.horario}</p>}
            </div>
            {evento?.local && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Local</p>
                <p className="font-medium text-gray-800">{evento.local}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Participante</p>
              <p className="font-medium text-gray-800">
                {ingresso.nome_participante || ingresso.nome_comprador}
              </p>
              {ingresso.tipo_participante === "convidado" && (
                <span className="text-xs text-orange-600 font-medium">(convidado)</span>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center pb-6 px-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <QRCodeSVG value={ingresso.id} size={180} level="H" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">{ingresso.id.slice(0, 8).toUpperCase()}</p>

            {/* Observação condicional */}
            {evento?.is_excursao ? (
              <div className="mt-4 w-full bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                  Este QR Code <span className="underline">não é válido</span> para entrada no local da excursão. Deve ser apresentado na escola para efetivo controle do participante. O ingresso para entrada no evento será entregue pela escola no local do evento.
                </p>
              </div>
            ) : (
              <div className="mt-4 w-full bg-blue-50 border-2 border-blue-400 rounded-lg p-4 flex gap-3 items-start">
                <Info className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900 font-semibold leading-relaxed">
                  Obrigatória a apresentação deste ingresso na entrada do evento.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleSaveImage} className="flex-1 bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />Salvar Imagem
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-50">
            <Share2 className="w-4 h-4 mr-2" />Compartilhar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IngressoDetalhe;
