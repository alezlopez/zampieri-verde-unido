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
  utilizado_em: string | null;
  utilizado_por: string | null;
  codigo_aluno: string | null;
  tipo_ingresso: string;
  categoria_meia: string | null;
  meia_validada_portaria: boolean;
  meia_validada_em: string | null;
  meia_validada_por: string | null;
  eventos: {
    titulo: string;
    data_evento: string;
  } | null;
}

const CATEGORIAS_LABELS: Record<string, string> = {
  estudante: "Estudante",
  idoso: "Idoso (60+)",
  pcd: "PCD",
  pcd_acompanhante: "Acompanhante de PCD",
  professor: "Professor rede pública",
};

const ScannerIngressos = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [ingresso, setIngresso] = useState<IngressoScanned | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [validadores, setValidadores] = useState<Record<string, string>>({});
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

  const fetchValidadores = useCallback(async (ids: string[]) => {
    const unicos = Array.from(new Set(ids.filter(Boolean)));
    if (!unicos.length) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, username")
      .in("user_id", unicos);
    if (data) {
      setValidadores((prev) => {
        const next = { ...prev };
        for (const r of data as any[]) next[r.user_id] = r.username;
        return next;
      });
    }
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    await stopScanner();
    setError(null);
    setIngresso(null);

    const { data, error: err } = await supabase
      .from("ingressos")
      .select("id, nome_comprador, nome_participante, tipo_participante, status, utilizado, utilizado_em, utilizado_por, codigo_aluno, tipo_ingresso, categoria_meia, meia_validada_portaria, meia_validada_em, meia_validada_por, eventos(titulo, data_evento)")
      .eq("id", decodedText)
      .single();

    if (err || !data) {
      setError("Ingresso não encontrado. Verifique o QR Code.");
      return;
    }

    const ing = data as unknown as IngressoScanned;
    setIngresso(ing);
    fetchValidadores([ing.utilizado_por, ing.meia_validada_por].filter(Boolean) as string[]);
  }, [stopScanner, fetchValidadores]);

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
    if (!ingresso || !user) return;
    if (ingresso.tipo_ingresso === "meia" && !ingresso.meia_validada_portaria) {
      toast({ title: "Valide o documento de meia primeiro", variant: "destructive" });
      return;
    }
    setMarking(true);
    const agora = new Date().toISOString();
    const { error: err } = await supabase
      .from("ingressos")
      .update({ utilizado: true, utilizado_em: agora, utilizado_por: user.id })
      .eq("id", ingresso.id);

    if (err) {
      toast({ title: "Erro ao marcar ingresso", variant: "destructive" });
    } else {
      setIngresso({ ...ingresso, utilizado: true, utilizado_em: agora, utilizado_por: user.id });
      fetchValidadores([user.id]);
      toast({ title: "Ingresso marcado como utilizado!" });
    }
    setMarking(false);
  };

  const validarDocMeia = async () => {
    if (!ingresso || !user) return;
    setMarking(true);
    const agora = new Date().toISOString();
    const { error: err } = await supabase
      .from("ingressos")
      .update({
        meia_validada_portaria: true,
        meia_validada_em: agora,
        meia_validada_por: user.id,
      })
      .eq("id", ingresso.id);

    if (err) {
      toast({ title: "Erro ao validar documento", variant: "destructive" });
    } else {
      setIngresso({ ...ingresso, meia_validada_portaria: true });
      toast({ title: "Documento de meia validado!" });
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
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="outline">{ingresso.tipo_participante}</Badge>
                      {ingresso.codigo_aluno && <Badge variant="outline">Aluno: {ingresso.codigo_aluno}</Badge>}
                      {ingresso.tipo_ingresso === "meia" ? (
                        <Badge className="bg-destructive text-destructive-foreground border-0">MEIA — exige documento</Badge>
                      ) : (
                        <Badge className="bg-zampieri-green/15 text-zampieri-green-dark border border-zampieri-green/40">Inteira</Badge>
                      )}
                    </div>
                  </div>

                  {ingresso.tipo_ingresso === "meia" && (
                    <div className={`rounded-md p-3 border ${ingresso.meia_validada_portaria ? "bg-zampieri-green/10 border-zampieri-green/40" : "bg-destructive/10 border-destructive/40"}`}>
                      <p className="text-xs uppercase tracking-wider font-bold mb-1">
                        {ingresso.meia_validada_portaria ? "✅ Documento validado" : "⚠️ Validação pendente"}
                      </p>
                      <p className="text-sm">
                        Categoria: <strong>{CATEGORIAS_LABELS[ingresso.categoria_meia ?? ""] ?? ingresso.categoria_meia ?? "—"}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confira o documento original (carteira de estudante, RG, laudo PCD ou identificação profissional) antes de liberar a entrada.
                      </p>
                    </div>
                  )}

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

                {ingresso.status === "pago" && !ingresso.utilizado && ingresso.tipo_ingresso === "meia" && !ingresso.meia_validada_portaria && (
                  <Button
                    onClick={validarDocMeia}
                    disabled={marking}
                    className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    size="lg"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {marking ? "Validando..." : "Validar documento de meia"}
                  </Button>
                )}

                {ingresso.status === "pago" && !ingresso.utilizado && (
                  <Button
                    onClick={markAsUsed}
                    disabled={marking || (ingresso.tipo_ingresso === "meia" && !ingresso.meia_validada_portaria)}
                    className="w-full mt-3 bg-zampieri-green-dark hover:bg-zampieri-green text-white"
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
