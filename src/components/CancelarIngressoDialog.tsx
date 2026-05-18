import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "ingresso" | "pedido";
  id: string;
  resumo: {
    titulo?: string;
    comprador?: string;
    valor?: number;
    forma?: string;
    parcelas?: number;
    temPagamento: boolean;
    cortesia?: boolean;
  };
  onDone?: () => void;
}

const formatBRL = (n?: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const CancelarIngressoDialog = ({ open, onOpenChange, tipo, id, resumo, onDone }: Props) => {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  const semEstorno = resumo.cortesia || !resumo.temPagamento;

  const submit = async () => {
    if (motivo.trim().length < 3) {
      toast({ title: "Informe o motivo", description: "Mínimo 3 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancelar-ingresso", {
        body: { tipo, id, motivo: motivo.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: semEstorno ? "Cancelado" : "Estorno solicitado",
        description: semEstorno
          ? "Registro cancelado e vagas liberadas."
          : "O Asaas processará o reembolso. Pode levar alguns dias úteis.",
      });
      onOpenChange(false);
      setMotivo("");
      setConfirmando(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) { setMotivo(""); setConfirmando(false); } } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zampieri-wine">
            <AlertTriangle className="h-5 w-5" />
            {semEstorno ? "Cancelar registro" : "Cancelar e solicitar estorno"}
          </DialogTitle>
          <DialogDescription>
            {semEstorno
              ? "Este registro será cancelado e a vaga liberada. Nenhum estorno será solicitado ao Asaas."
              : "O estorno integral será solicitado ao Asaas. A vaga será liberada imediatamente. Esta ação não é reversível."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            {resumo.titulo && <div><span className="text-muted-foreground">Item:</span> {resumo.titulo}</div>}
            {resumo.comprador && <div><span className="text-muted-foreground">Comprador:</span> {resumo.comprador}</div>}
            <div><span className="text-muted-foreground">Valor:</span> {formatBRL(resumo.valor)}</div>
            {resumo.forma && (
              <div>
                <span className="text-muted-foreground">Pagamento:</span> {resumo.forma}
                {(resumo.parcelas || 1) > 1 && <> · {resumo.parcelas}x</>}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="motivo">Motivo do cancelamento *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique brevemente o motivo (será registrado)"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Voltar
          </Button>
          {!confirmando ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmando(true)}
              disabled={motivo.trim().length < 3}
            >
              Continuar
            </Button>
          ) : (
            <Button variant="destructive" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {semEstorno ? "Confirmar cancelamento" : "Confirmar estorno"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
