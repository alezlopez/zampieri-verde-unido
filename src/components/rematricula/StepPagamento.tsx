import { useEffect, useMemo, useState } from "react";
import { CreditCard, Copy, Loader2, Lock, QrCode, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export interface StatusRematricula {
  contrato_assinado: boolean;
  rematricula_concluida: boolean;
  valor_avista: number | null;
  valor_parcelado: number | null;
  max_parcelas: number | null;
  isentar_valor_rematricula?: boolean | null;
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
  const [numeros, setNumeros] = useState<{ numero: string; faixa: string }[]>([]);
  const [pix, setPix] = useState<
    { copia_cola: string; qr_image: string | null; expira_em: string | null } | null
  >(null);
  const [cartao, setCartao] = useState<
    { checkout_url: string; forma_pagamento: string; parcelas: number; expira_em: string | null } | null
  >(null);
  const [consultando, setConsultando] = useState(true);
  const [faseVirou, setFaseVirou] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());




  const concluida = !!status?.rematricula_concluida;

  useEffect(() => {
    if (!concluida) return;
    let ativo = true;
    supabase
      .rpc("rematricula_2027_numeros_do_aluno", {
        p_id_aluno: idAluno,
        p_data_nascimento: dataNascimento,
      })
      .then(({ data }) => {
        if (ativo) setNumeros((data as { numero: string; faixa: string }[]) ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [concluida, idAluno, dataNascimento]);

  // Consulta se já existe um pagamento gerado (PIX ou cartão) ainda válido
  useEffect(() => {
    if (concluida || !status?.contrato_assinado || status?.isentar_valor_rematricula) {
      setConsultando(false);
      return;
    }
    let ativo = true;
    setConsultando(true);
    supabase.functions
      .invoke("rematricula-2027-checkout", {
        body: { id_aluno: idAluno, data_nascimento: dataNascimento, apenas_consultar: true },
      })
      .then(({ data }) => {
        if (!ativo) return;
        const res = data as {
          existente?: boolean;
          fase_virou?: boolean;
          mode?: string;
          pix?: { copia_cola: string; qr_image: string | null; expira_em: string | null };
          checkout_url?: string;
          forma_pagamento?: string;
          parcelas?: number;
          expira_em?: string | null;
        } | null;
        setFaseVirou(!!res?.fase_virou);
        if (res?.existente && res.mode === "pix" && res.pix?.copia_cola) {
          setPix(res.pix);
          setOpcao("pix");
        } else if (res?.existente && res.checkout_url) {
          setCartao({
            checkout_url: res.checkout_url,
            forma_pagamento: res.forma_pagamento || "credit_card",
            parcelas: Number(res.parcelas || 1),
            expira_em: res.expira_em ?? null,
          });
          setOpcao(Number(res.parcelas || 1) > 1 ? "credito_parcelado" : "credito_avista");
          if (Number(res.parcelas || 1) > 1) setParcelas(Number(res.parcelas));
        }
      })
      .finally(() => {
        if (ativo) setConsultando(false);
      });
    return () => {
      ativo = false;
    };
  }, [concluida, idAluno, dataNascimento, status?.contrato_assinado, status?.isentar_valor_rematricula]);

  // Relógio para contagem regressiva + verificação automática do pagamento
  useEffect(() => {
    if ((!pix && !cartao) || concluida) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pix, cartao, concluida]);

  useEffect(() => {
    if ((!pix && !cartao) || concluida) return;
    const t = setInterval(() => onVerificar(), 15000);
    return () => clearInterval(t);
  }, [pix, cartao, concluida, onVerificar]);

  const formatarRestante = (alvo: number) => {
    const s = Math.max(0, Math.floor((alvo - agora) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // Teto de segurança: nunca exibir prazo maior que 24h
  const TETO_24H_MS = 24 * 60 * 60 * 1000;
  const limitar24h = (t: number) => (t ? Math.min(t, Date.now() + TETO_24H_MS) : 0);

  const pixExpiraEm = limitar24h(pix?.expira_em ? new Date(pix.expira_em).getTime() : 0);
  const pixExpirado = !!pix && !!pixExpiraEm && pixExpiraEm <= agora;
  const restante = useMemo(() => {
    if (!pixExpiraEm || pixExpirado) return null;
    return formatarRestante(pixExpiraEm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixExpiraEm, pixExpirado, agora]);

  const cartaoExpiraEm = limitar24h(cartao?.expira_em ? new Date(cartao.expira_em).getTime() : 0);
  const cartaoExpirado = !!cartao && !!cartaoExpiraEm && cartaoExpiraEm <= agora;
  const restanteCartao = useMemo(() => {
    if (!cartaoExpiraEm || cartaoExpirado) return null;
    return formatarRestante(cartaoExpiraEm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartaoExpiraEm, cartaoExpirado, agora]);



  const valorAvista = Number(status?.valor_avista || 0);
  const valorParcelado = Number(status?.valor_parcelado || 0);
  const maxParcelas = Math.min(12, Math.max(2, Number(status?.max_parcelas || 12)));
  const permiteParcelar = valorParcelado > 0;

  const opcoesParcelas = useMemo(
    () => Array.from({ length: maxParcelas - 1 }, (_, i) => i + 2),
    [maxParcelas],
  );

  if (concluida) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream/60 p-4 text-center space-y-2">
          <CheckCircle2 className="w-7 h-7 text-zampieri-green-dark mx-auto" />
          <p className="font-semibold text-zampieri-green-dark">Rematrícula concluída!</p>
          <p className="text-sm text-muted-foreground">
            Pagamento confirmado. Nossa secretaria dará sequência ao processo.
          </p>
        </div>

        {numeros.length > 0 && (
          <div className="rounded-lg border border-zampieri-gold bg-white p-4 text-center space-y-3">
            <div>
              <Sparkles className="w-6 h-6 text-zampieri-gold mx-auto" />
              <p className="font-semibold text-zampieri-green-dark mt-1">
                Seus números da sorte
              </p>
              <p className="text-xs text-muted-foreground">
                {numeros.length} número(s) gerados para o sorteio.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {numeros.map((n) => (
                <span
                  key={n.numero}
                  className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream px-4 py-2 font-mono text-lg font-bold tracking-widest text-zampieri-green-dark"
                >
                  {n.numero}
                </span>
              ))}
            </div>
            <a
              href="/numerosdasorte"
              className="inline-block text-xs font-medium text-zampieri-green-dark underline"
            >
              Consultar depois em /numerosdasorte
            </a>
          </div>
        )}
      </div>
    );
  }


  if (status?.isentar_valor_rematricula) {
    return (
      <div className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream/60 p-4 space-y-3 text-left">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-zampieri-green-dark shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zampieri-green-dark">
              Rematrícula isenta de taxa — nada a pagar.
            </p>
            <p className="text-sm text-muted-foreground">
              {status.contrato_assinado
                ? "Assinatura recebida. Estamos finalizando sua rematrícula."
                : "Basta assinar o contrato para concluir a rematrícula."}
            </p>
          </div>
        </div>
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

  const pagar = async (forcarNovo = false) => {
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-checkout", {
      body: {
        id_aluno: idAluno,
        data_nascimento: dataNascimento,
        forma_pagamento: opcao === "pix" ? "pix" : "credit_card",
        parcelas: opcao === "credito_parcelado" ? parcelas : 1,
        origin: window.location.origin,
        force_regenerate: forcarNovo,
      },
    });
    let res = data as
      | {
        checkout_url?: string;
        error?: string;
        mode?: string;
        existente?: boolean;
        forma_pagamento?: string;
        parcelas?: number;
        expira_em?: string | null;
        pix?: { copia_cola: string; qr_image: string | null; expira_em: string | null };
      }
      | null;
    if (!res && error) {
      try {
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") res = await ctx.json();
      } catch { /* ignore */ }
    }

    if (!error && res?.mode === "pix" && res.pix?.copia_cola) {
      setPix(res.pix);
      setCartao(null);
      setCopiado(false);
      setEnviando(false);
      return;
    }

    if (error || !res?.checkout_url) {
      setEnviando(false);
      const code = res?.error;
      setErro(
        code === "contrato_nao_assinado"
          ? "O contrato ainda não consta como assinado."
          : code === "ja_pago"
            ? "Esta rematrícula já consta como paga."
            : code
              ? `Não foi possível abrir o pagamento: ${code}`
              : "Não foi possível abrir o pagamento. Tente novamente em instantes.",
      );
      return;
    }
    setPix(null);
    setCartao({
      checkout_url: res.checkout_url,
      forma_pagamento: res.forma_pagamento || (opcao === "credito_parcelado" ? "credit_card" : "credit_card"),
      parcelas: Number(res.parcelas || (opcao === "credito_parcelado" ? parcelas : 1)),
      expira_em: res.expira_em ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    setEnviando(false);
    window.location.href = res.checkout_url;

    window.location.href = res.checkout_url;
  };

  const copiarPix = async () => {
    if (!pix?.copia_cola) return;
    try {
      await navigator.clipboard.writeText(pix.copia_cola);
    } catch {
      const el = document.createElement("textarea");
      el.value = pix.copia_cola;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
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

  const pagamentoAtivo = (!!pix && !pixExpirado) || (!!cartao && !cartaoExpirado);

  if (consultando) {
    return (
      <div className="rounded-lg border border-zampieri-gold bg-white p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Verificando pagamentos gerados…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zampieri-gold bg-white p-4 space-y-3 text-left">
      <div>
        <p className="font-semibold text-zampieri-green-dark">Pagamento da rematrícula</p>
        <p className="text-xs text-muted-foreground">
          {pagamentoAtivo
            ? "Você já tem um pagamento gerado. Conclua-o abaixo — só é possível gerar outro depois que ele expirar."
            : "Escolha a forma de pagamento."}
        </p>
      </div>

      {faseVirou && !pagamentoAtivo && (
        <p className="text-xs rounded-md bg-zampieri-cream/60 border border-zampieri-gold p-2 text-zampieri-green-dark">
          O período anterior foi encerrado. O pagamento que havia sido gerado não é mais válido e o
          valor abaixo já está atualizado para o período atual.
        </p>
      )}

      {aguardandoPagamento && (
        <p className="text-xs rounded-md bg-zampieri-cream/60 border border-zampieri-gold p-2 text-zampieri-green-dark">
          Pagamento em processamento. Assim que o Asaas confirmar, esta tela é atualizada
          automaticamente.
        </p>
      )}

      {!pagamentoAtivo && (
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
      )}

      {!pagamentoAtivo && opcao === "credito_parcelado" && permiteParcelar && (
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

      {cartao && (
        <div className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream/40 p-3 space-y-3 text-center">
          <p className="text-sm font-semibold text-zampieri-green-dark">
            {cartaoExpirado ? "Link de pagamento expirado" : "Pagamento no cartão já gerado"}
          </p>
          {!cartaoExpirado ? (
            <>
              <p className="text-xs text-muted-foreground">
                {cartao.parcelas > 1 ? `Cartão em ${cartao.parcelas}x` : "Cartão à vista"}.
                {restanteCartao && <> Este link vale por mais <strong>{restanteCartao}</strong>.</>}
              </p>
              <a href={cartao.checkout_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-zampieri-green-dark hover:bg-zampieri-green">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Continuar pagamento
                </Button>
              </a>
              <p className="text-xs text-muted-foreground">
                Enquanto este link estiver válido, não é possível gerar outro pagamento.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Este link não é mais válido. Você já pode gerar um novo pagamento.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setCartao(null);
                  setErro(null);
                }}
                disabled={enviando}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Escolher forma de pagamento
              </Button>
            </>
          )}
        </div>
      )}

      {pix && (
        <div className="rounded-lg border border-zampieri-green-dark bg-zampieri-cream/40 p-3 space-y-3 text-center">
          <p className="text-sm font-semibold text-zampieri-green-dark">
            {pixExpirado ? "Código PIX expirado" : "PIX já gerado — pague com este código"}
          </p>

          {!pixExpirado && pix.qr_image && (
            <img
              src={pix.qr_image}
              alt="QR Code PIX da rematrícula 2027"
              className="mx-auto h-48 w-48 rounded-md bg-white p-2"
            />
          )}

          {!pixExpirado ? (
            <>
              <p className="text-xs text-muted-foreground">
                Escaneie o QR Code ou use o código copia e cola abaixo.
                {restante && <> Válido por mais <strong>{restante}</strong>.</>}
              </p>
              <p className="break-all rounded-md border border-border bg-white p-2 font-mono text-[10px] text-muted-foreground">
                {pix.copia_cola}
              </p>
              <Button
                className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
                onClick={copiarPix}
              >
                {copiado ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copiado ? "Código copiado!" : "Copiar código PIX"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Assim que o pagamento for identificado, esta tela é atualizada automaticamente.
                Não é preciso gerar outro código.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Este código não é mais válido. Gere um novo para concluir o pagamento.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => pagar(true)}
                disabled={enviando}
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Gerar novo código PIX
              </Button>
            </>
          )}
        </div>
      )}

      {!pagamentoAtivo && !pix && opcao === "pix" && (
        <p className="text-xs text-muted-foreground">
          O código PIX é gerado aqui mesmo e vale por 24 horas. Se expirar, você poderá gerar um
          novo nesta página.
        </p>
      )}

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {!pagamentoAtivo && !pix && !cartao && (
        <Button
          className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
          onClick={() => pagar(false)}
          disabled={enviando}
        >
          {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {opcao === "pix" ? "Gerar código PIX" : "Ir para o pagamento"}
        </Button>
      )}
    </div>
  );

};

