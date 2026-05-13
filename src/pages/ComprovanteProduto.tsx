import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface Comprovante {
  pedido_id: string;
  produto: string;
  variacao: string;
  quantidade: number;
  nome_comprador: string;
  status: string;
  evento_titulo: string | null;
  evento_data: string | null;
  evento_local: string | null;
  retirado_em: string | null;
}

const ComprovanteProduto = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Comprovante | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const { data: rows } = await supabase.rpc("get_comprovante_produto", { p_qr_token: token });
      const row = Array.isArray(rows) ? rows[0] : rows;
      setData(row || null);
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" /></div>;
  }
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col">
        <EventosHeader subtitle="Comprovante" />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card><CardContent className="p-8 text-center">Comprovante não encontrado.</CardContent></Card>
        </div>
        <Footer />
      </div>
    );
  }

  const qrPayload = `prod:${token}`;
  const isPago = data.status === "pago" || data.status === "retirado";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Comprovante de retirada" />
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-md">
          <Link to="/eventos/meus-ingressos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Meus comprovantes
          </Link>

          <Card className={data.retirado_em ? "border-zampieri-green/40 bg-zampieri-green/5" : isPago ? "border-zampieri-gold/40" : "border-muted"}>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">{data.produto}</h1>
                <p className="text-muted-foreground">{data.variacao}</p>
                <Badge className="mt-2 bg-zampieri-gold/20 text-zampieri-green-dark border border-zampieri-gold/40">
                  Quantidade: {data.quantidade}
                </Badge>
              </div>

              {isPago ? (
                <div className="bg-white p-4 rounded-lg border-2 border-zampieri-gold/40 flex justify-center">
                  <QRCodeSVG value={qrPayload} size={200} level="H" />
                </div>
              ) : (
                <div className="bg-zampieri-cream rounded-lg p-4 text-center">
                  <Badge>Pagamento {data.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-2">QR liberado após confirmação do pagamento.</p>
                </div>
              )}

              {data.retirado_em && (
                <div className="bg-zampieri-green/10 border border-zampieri-green/40 rounded p-3 text-center">
                  <CheckCircle2 className="w-6 h-6 text-zampieri-green-dark mx-auto" />
                  <p className="text-sm font-bold text-zampieri-green-dark">Retirado em {new Date(data.retirado_em).toLocaleString("pt-BR")}</p>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase">Comprador</p>
                <p className="font-medium">{data.nome_comprador}</p>
              </div>

              {data.evento_titulo && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs text-muted-foreground uppercase">Evento</p>
                  <p className="font-medium">{data.evento_titulo}</p>
                  {data.evento_data && <p className="text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(data.evento_data + "T00:00:00").toLocaleDateString("pt-BR")}</p>}
                  {data.evento_local && <p className="text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{data.evento_local}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ComprovanteProduto;
