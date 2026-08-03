import { useMemo, useState } from "react";
import { CreditCard, Loader2, Lock, QrCode, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export interface StatusRematricula {
  contrato_assinado: boolean;
  rematricula_concluida: boolean;
  valor_avista: number | null;
  valor_parcelado: number | null;
  max_parcelas: number | null;
}

interface Props {
  idAluno: number;
  dataNascimento: string; // ISO
  status: StatusRematricula | null;
  verificando: boolean;
  onVerificar: () => void;
  aguardandoPagamento?: boolean;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Opcao = "pix" | "credito_avista" | "credito_parcelado";

export const StepPagamento = ({
  idAluno,
  dataNascimento,
  status,
  verificando,
  onVerificar,
  aguardandoPagamento,
}: Props) => {
  const [opcao, setOpcao] = useState<Opcao>("pix");
  const [parcelas, setParcelas] = useState(12);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorAvista = Number(status?.valor_avista || 0);
  const valorParcelado = Number(status?.valor_parcelado || 0);
  const maxParcelas = Math.min(12, Math.max(2, Number(status?.max_parcelas || 12)));
  const permiteParcelar = valorParcelado > 0;

  const opcoesParcelas = useMemo(
    () => Array.from({ length: maxParcelas - 1 }, (_, i) => i + 2),
    [maxParcelas],
  );

  if (status?.rematricula_concluida) {
    return (
      <div className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream/60 p-4 text-center space-y-2">
        <CheckCircle2 className="w-7 h-7 text-zampieri-green-dark mx-auto" />
        <p className="font-semibold text-zampieri-green-dark">Rematrícula concluída!</p>
        <p className="text-sm text-muted-foreground">
          Pagamento confirmado. Nossa secretaria dará sequência ao processo.
        </p>
      </div>
    );
  }

  if (!status?.contrato_assinado) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 text-left">
        <div className="flex items-start gap-2">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Pagamento bloqueado</p>
            <p className="text-sm text-muted-foreground">
              O pagamento da rematrícula é liberado assim que a assinatura do contrato for
              identificada. A rematrícula só é concluída após o pagamento.
            </p>
          </div>
        </div>
        <Button className="w-full" disabled>
          <Lock className="w-4 h-4 mr-2" />
          Pagar rematrícula
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={onVerificar} disabled={verificando}>
          {verificando ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Já assinei — verificar
        </Button>
      </div>
    );
  }

  const pagar = async () => {
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-checkout", {
      body: {
        id_aluno: idAluno,
        data_nascimento: dataNascimento,
        forma_pagamento: opcao === "pix" ? "pix" : "credit_card",
        parcelas: opcao === "credito_parcelado" ? parcelas : 1,
        origin: window.location.origin,
      },
    });
    const res = data as { checkout_url?: string; error?: string } | null;
    if (error || !res?.checkout_url) {
      setEnviando(false);
      setErro(
        res?.error === "contrato_nao_assinado"
          ? "O contrato ainda não consta como assinado."
          : "Não foi possível abrir o pagamento. Tente novamente em instantes.",
      );
      return;
    }
    window.location.href = res.checkout_url;
  };

  const Card = ({
    id,
    icone,
    titulo,
    valor,
    detalhe,
  }: {
    id: Opcao;
    icone: React.ReactNode;
    titulo: string;
    valor: string;
    detalhe?: string;
  }) => (
    <button
      type="button"
      onClick={() => setOpcao(id)}
      className={`w-full text-left rounded-lg border p-3 transition ${
        opcao === id
          ? "border-zampieri-green-dark bg-zampieri-cream/60 ring-1 ring-zampieri-green-dark"
          : "border-border hover:border-zampieri-green-light"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-zampieri-green-dark">{icone}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zampieri-green-dark">{titulo}</p>
          {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        </div>
        <p className="text-sm font-bold text-zampieri-green-dark">{valor}</p>
      </div>
    </button>
  );

  return (
    <div className="rounded-lg border border-zampieri-gold bg-white p-4 space-y-3 text-left">
      <div>
        <p className="font-semibold text-zampieri-green-dark">Pagamento da rematrícula</p>
        <p className="text-xs text-muted-foreground">Escolha a forma de pagamento.</p>
      </div>

      {aguardandoPagamento && (
        <p className="text-xs rounded-md bg-zampieri-cream/60 border border-zampieri-gold p-2 text-zampieri-green-dark">
          Pagamento em processamento. Assim que o Asaas confirmar, esta tela é atualizada
          automaticamente.
        </p>
      )}

      <div className="space-y-2">
        <Card id="pix" icone={<QrCode className="w-5 h-5" />} titulo="PIX à vista" valor={brl(valorAvista)} />
        <Card
          id="credito_avista"
          icone={<CreditCard className="w-5 h-5" />}
          titulo="Cartão à vista"
          valor={brl(valorAvista)}
        />
        {permiteParcelar && (
          <Card
            id="credito_parcelado"
            icone={<CreditCard className="w-5 h-5" />}
            titulo="Cartão parcelado"
            detalhe={`${parcelas}x de ${brl(valorParcelado / parcelas)}`}
            valor={brl(valorParcelado)}
          />
        )}
      </div>

      {opcao === "credito_parcelado" && permiteParcelar && (
        <div>
          <label className="text-xs text-muted-foreground">Número de parcelas</label>
          <select
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
            className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {opcoesParcelas.map((n) => (
              <option key={n} value={n}>
                {n}x de {brl(valorParcelado / n)}
              </option>
            ))}
          </select>
        </div>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      <Button
        className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
        onClick={pagar}
        disabled={enviando}
      >
        {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Ir para o pagamento
      </Button>
    </div>
  );
};
