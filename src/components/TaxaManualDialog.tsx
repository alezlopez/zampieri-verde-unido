import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "ingresso" | "pedido";
  id: string;
  valorBruto: number;
  taxaAtual: number | null;
  taxaManual: number | null;
  onSaved?: () => void;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const TaxaManualDialog = ({
  open, onOpenChange, tipo, id, valorBruto, taxaAtual, taxaManual, onSaved,
}: Props) => {
  const { toast } = useToast();
  const [valor, setValor] = useState<string>(taxaManual !== null ? String(taxaManual).replace(".", ",") : "");
  const [loading, setLoading] = useState(false);

  const parsedValor = (() => {
    if (!valor.trim()) return null;
    const n = Number(valor.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  })();
  const liquidoPreview = parsedValor !== null
    ? valorBruto - parsedValor
    : (taxaAtual !== null ? valorBruto - taxaAtual : null);

  const call = async (taxa: number | null) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("atualizar-taxa-manual", {
        body: { tipo, id, taxa_manual: taxa },
      });
      if (error) throw error;
      toast({ title: taxa !== null ? "Taxa manual salva" : "Taxa manual removida" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar taxa manualmente</DialogTitle>
          <DialogDescription>
            Substitui a taxa calculada automaticamente. Deixe vazio e clique em "Usar automática" para voltar ao cálculo padrão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <div>Valor bruto: <strong>{formatBRL(valorBruto)}</strong></div>
            <div>Taxa calculada automaticamente: <strong>{taxaAtual !== null ? formatBRL(taxaAtual) : "—"}</strong></div>
            {taxaManual !== null && (
              <div className="text-zampieri-wine">Taxa manual atual: <strong>{formatBRL(taxaManual)}</strong></div>
            )}
          </div>
          <div>
            <Label htmlFor="taxa">Nova taxa (R$)</Label>
            <Input
              id="taxa"
              inputMode="decimal"
              placeholder="Ex: 1,99"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          {liquidoPreview !== null && (
            <div className="text-sm text-muted-foreground">
              Líquido resultante: <strong>{formatBRL(liquidoPreview)}</strong>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={loading} onClick={() => call(null)}>
            Usar automática
          </Button>
          <Button disabled={loading || parsedValor === null || parsedValor < 0} onClick={() => call(parsedValor)}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar taxa manual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
