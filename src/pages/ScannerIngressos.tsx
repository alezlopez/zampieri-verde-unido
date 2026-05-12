import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ScanLine } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface IngressoScanned {
  id: string;
  nome_comprador: string;
  nome_participante: string | null;
  tipo_participante: string;
  status: string;
  utilizado: boolean;
  codigo_aluno: string | null;
  eventos: {
    titulo: string;
    data_evento: string;
  } | null;
}

const ScannerIngressos = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [ingresso, setIngresso] = useState<IngressoScanned | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/eventos/login");
  }, [user, isAdmin, authLoading, navigate]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    await stopScanner();
    setError(null);
    setIngresso(null);

    const { data, error: err } = await supabase
      .from("ingressos")
      .select("id, nome_comprador, nome_participante, tipo_participante, status, utilizado, codigo_aluno, eventos(titulo, data_evento)")
      .eq("id", decodedText)
      .single();

    if (err || !data) {
      setError("Ingresso não encontrado. Verifique o QR Code.");
      return;
    }

    setIngresso(data as unknown as IngressoScanned);
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    setIngresso(null);
    setError(null);
    setScanning(true);

    await new Promise((r) => setTimeout(r, 300));

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      );
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      setScanning(false);
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const markAsUsed = async () => {
    if (!ingresso) return;
    setMarking(true);
    const { error: err } = await supabase
      .from("ingressos")
      .update({ utilizado: true })
      .eq("id", ingresso.id);

    if (err) {
      toast({ title: "Erro ao marcar ingresso", variant: "destructive" });
    } else {
      setIngresso({ ...ingresso, utilizado: true });
      toast({ title: "Ingresso marcado como utilizado!" });
    }
    setMarking(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Scanner de ingressos" />

      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-md">
          <Link to="/eventos/admin" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Painel Admin
          </Link>

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-6">Scanner de Ingressos</h1>

          {!scanning && !ingresso && !error && (
            <div className="text-center">
              <Button onClick={startScanner} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white" size="lg">
                <ScanLine className="w-5 h-5 mr-2" />
                Iniciar Scanner
              </Button>
              <p className="text-sm text-muted-foreground mt-3">Aponte a câmera para o QR Code do ingresso</p>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="rounded-lg overflow-hidden border-2 border-zampieri-gold" ref={containerRef} />
              <Button variant="outline" onClick={stopScanner} className="w-full border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
                Parar Scanner
              </Button>
            </div>
          )}

          {error && (
            <Card className="border-destructive/40 bg-destructive/10 mt-4">
              <CardContent className="p-6 text-center">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="text-destructive font-medium">{error}</p>
                <Button onClick={startScanner} className="mt-4 bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                  Escanear Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {ingresso && (
            <Card className={`mt-4 ${ingresso.utilizado ? "border-destructive/40 bg-destructive/5" : ingresso.status === "pago" ? "border-zampieri-green/40 bg-zampieri-green/5" : "border-zampieri-gold/40 bg-zampieri-cream"}`}>
              <CardContent className="p-6">
                {ingresso.utilizado && (
                  <div className="flex items-center gap-2 bg-destructive/15 border border-destructive/40 rounded-lg p-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    <p className="text-sm font-bold text-destructive">ATENÇÃO: Este ingresso já foi utilizado!</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Evento</p>
                    <p className="font-serif font-semibold text-zampieri-green-dark">{ingresso.eventos?.titulo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Participante</p>
                    <p className="font-medium text-foreground">{ingresso.nome_participante || ingresso.nome_comprador}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{ingresso.tipo_participante}</Badge>
                      {ingresso.codigo_aluno && <Badge variant="outline">Aluno: {ingresso.codigo_aluno}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Status:</p>
                    <Badge className={
                      ingresso.status === "pago" ? "bg-zampieri-green/15 text-zampieri-green-dark border border-zampieri-green/40" :
                      ingresso.status === "cancelado" ? "bg-destructive/15 text-destructive border border-destructive/40" :
                      "bg-zampieri-gold/20 text-zampieri-green-dark border border-zampieri-gold/40"
                    }>
                      {ingresso.status}
                    </Badge>
                  </div>
                </div>

                {ingresso.status === "pago" && !ingresso.utilizado && (
                  <Button
                    onClick={markAsUsed}
                    disabled={marking}
                    className="w-full mt-4 bg-zampieri-green-dark hover:bg-zampieri-green text-white"
                    size="lg"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {marking ? "Marcando..." : "Marcar como Utilizado"}
                  </Button>
                )}

                <Button onClick={startScanner} variant="outline" className="w-full mt-3 border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
                  <ScanLine className="w-4 h-4 mr-2" />
                  Escanear Outro
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ScannerIngressos;
