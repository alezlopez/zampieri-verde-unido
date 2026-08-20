import { useState } from "react";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, Debito } from "./StepDebitos";

type Forma = "pix" | "cartao_avista" | "cartao_parcelado";

interface Props {
  idAluno: number;
  dataNascimento: string;
  debitos: Debito[];
  selecionados: number[];
  onVoltar: () => void;
}

export const StepPagamentoDebitos = ({
  idAluno,
  dataNascimento,
  debitos,
  selecionados,
  onVoltar,
}: Props) => {
  const [forma, setForma] = useState<Forma>("pix");
  const [parcelas, setParcelas] = useState("2");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const escolhidos = debitos.filter((d) => selecionados.includes(d.row_id) && !d.pago);
  const totalAvista = escolhidos.reduce((a, d) => a + Number(d.valor_a_vista || 0), 0);
  const totalParcelado = escolhidos.reduce((a, d) => a + Number(d.valor_parcelado || 0), 0);
  const n = Number(parcelas);

  const pagar = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("renegociacao-2027-checkout", {
      body: {
        id_aluno: idAluno,
        data_nascimento: dataNascimento,
        row_ids: selecionados,
        forma_pagamento: forma === "pix" ? "pix" : "credit_card",
        parcelas: forma === "cartao_parcelado" ? n : 1,
        origin: window.location.origin,
      },
    });
    const res = data as { checkout_url?: string; error?: string } | null;
    if (error || !res?.checkout_url) {
      setLoading(false);
      setErro(
        res?.error === "debitos_ja_pagos"
          ? "Estes débitos já constam como pagos. Atualize a página."
          : "Não foi possível gerar o pagamento agora. Tente novamente em instantes.",
      );
      return;
    }
    window.location.href = res.checkout_url;
  };

  const opcoes: { id: Forma; titulo: string; valor: string; icone: typeof QrCode }[] = [
    { id: "pix", titulo: "PIX à vista", valor: brl(totalAvista), icone: QrCode },
    { id: "cartao_avista", titulo: "Cartão à vista", valor: brl(totalAvista), icone: CreditCard },
    {
      id: "cartao_parcelado",
      titulo: "Cartão parcelado",
      valor: `${n}x de ${brl(totalParcelado / n)} (${brl(totalParcelado)})`,
      icone: CreditCard,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Forma de pagamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {escolhidos.length} mensalidade(s) selecionada(s).
        </p>
      </div>

      <div className="space-y-2">
        {opcoes.map((o) => {
          const ativo = forma === o.id;
          const Icone = o.icone;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setForma(o.id)}
              className={`w-full text-left rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                ativo ? "border-zampieri-green-dark bg-zampieri-cream/60" : "border-border"
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
                <Icone className="w-4 h-4 text-zampieri-green-dark" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zampieri-green-dark">{o.titulo}</span>
                <span className="block text-xs text-muted-foreground">{o.valor}</span>
              </span>
            </button>
          );
        })}
      </div>

      {forma === "cartao_parcelado" && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Número de parcelas</span>
          <Select value={parcelas} onValueChange={setParcelas}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {p}x de {brl(totalParcelado / p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1" disabled={loading}>
          Voltar
        </Button>
        <Button
          onClick={pagar}
          disabled={loading || escolhidos.length === 0}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Ir para o pagamento
        </Button>
      </div>
    </div>
  );
};
