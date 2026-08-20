import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export interface Debito {
  row_id: number;
  evento: string | null;
  vencimento: string | null;
  valor_principal: number | null;
  juros: number | null;
  multa: number | null;
  valor_a_vista: number | null;
  valor_parcelado: number | null;
  pago: boolean;
  pago_em: string | null;
}

export const brl = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataBr = (iso: string | null) => {
  if (!iso) return "-";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
};

interface Props {
  nomeAluno: string;
  idAluno: number;
  dataNascimento: string;
  debitos: Debito[];
  selecionados: number[];
  onSelecionar: (rows: number[]) => void;
  onAvancar: () => void;
  onVoltar: () => void;
}

export const StepDebitos = ({
  nomeAluno,
  debitos,
  selecionados,
  onSelecionar,
  onAvancar,
  onVoltar,
}: Props) => {
  const abertos = useMemo(() => debitos.filter((d) => !d.pago), [debitos]);
  const pagos = useMemo(() => debitos.filter((d) => d.pago), [debitos]);

  const totalAvista = abertos
    .filter((d) => selecionados.includes(d.row_id))
    .reduce((acc, d) => acc + Number(d.valor_a_vista || 0), 0);
  const totalParcelado = abertos
    .filter((d) => selecionados.includes(d.row_id))
    .reduce((acc, d) => acc + Number(d.valor_parcelado || 0), 0);

  const alternar = (rowId: number) =>
    onSelecionar(
      selecionados.includes(rowId)
        ? selecionados.filter((r) => r !== rowId)
        : [...selecionados, rowId],
    );

  const todos = selecionados.length === abertos.length && abertos.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
          <ReceiptText className="w-5 h-5 text-zampieri-green-dark" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">
            Débitos de {nomeAluno}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione as mensalidades que deseja pagar agora. A rematrícula só é liberada quando
            todas as pendências forem quitadas.
          </p>
        </div>
      </div>

      {abertos.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {abertos.length} mensalidade(s) em aberto
          </p>
          <button
            type="button"
            className="text-xs font-medium text-zampieri-green-dark underline"
            onClick={() => onSelecionar(todos ? [] : abertos.map((d) => d.row_id))}
          >
            {todos ? "Limpar seleção" : "Selecionar todas"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {abertos.map((d) => {
          const marcado = selecionados.includes(d.row_id);
          return (
            <button
              key={d.row_id}
              type="button"
              onClick={() => alternar(d.row_id)}
              className={`w-full text-left rounded-lg border p-4 flex items-start gap-3 transition-colors ${
                marcado ? "border-zampieri-green-dark bg-zampieri-cream/60" : "border-border"
              }`}
            >
              <Checkbox checked={marcado} className="mt-0.5 pointer-events-none" />
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zampieri-green-dark">
                    {d.evento || "Mensalidade"} • venc. {dataBr(d.vencimento)}
                  </span>
                  <span className="text-sm font-bold text-foreground">{brl(d.valor_a_vista)}</span>
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Principal {brl(d.valor_principal)} + juros {brl(d.juros)} + multa {brl(d.multa)} ·
                  parcelado {brl(d.valor_parcelado)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {pagos.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">Já quitadas</p>
          <ul className="mt-2 space-y-1">
            {pagos.map((d) => (
              <li key={d.row_id} className="text-xs text-muted-foreground flex justify-between gap-2">
                <span>
                  {d.evento || "Mensalidade"} • venc. {dataBr(d.vencimento)}
                </span>
                <span className="font-medium text-zampieri-green-dark">Paga</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {abertos.length > 0 && selecionados.length < abertos.length && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            Pagando apenas parte das mensalidades, a rematrícula continua bloqueada até a
            regularização total.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total à vista (PIX ou cartão)</span>
          <span className="font-bold text-zampieri-green-dark">{brl(totalAvista)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total parcelado no cartão</span>
          <span className="font-medium text-foreground">{brl(totalParcelado)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button
          onClick={onAvancar}
          disabled={selecionados.length === 0}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export const carregarDebitos = async (idAluno: number, dataNascimento: string) => {
  const { data, error } = await supabase.rpc("renegociacao_2027_debitos", {
    p_id_aluno: idAluno,
    p_data_nascimento: dataNascimento,
  });
  if (error) throw error;
  return ((data as unknown as Debito[]) ?? []).map((d) => ({ ...d, row_id: Number(d.row_id) }));
};

export const LoadingDebitos = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
    <Loader2 className="w-4 h-4 animate-spin" /> Carregando seus débitos...
  </div>
);
