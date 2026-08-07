import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, FileUp, Loader2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import GuiaEnvio from "@/components/matricula/GuiaEnvio";

interface DocEstado {
  tipo: string;
  label: string;
  obrigatorio: boolean;
  status: string;
  nome_arquivo: string | null;
  motivo: string | null;
}

interface Estado {
  aluno: string;
  responsavel: string;
  protocolo: string;
  serie: string;
  turno: string;
  desconto: number | null;
  matricula: {
    id: string;
    status: string;
    contrato_gerado: boolean;
    contrato_assinado: boolean;
    link_contrato: string | null;
    valor_matricula: number | null;
    permite_avista: boolean;
    permite_parcelado: boolean;
    max_parcelas: number;
    checkout_url: string | null;
    forma_pagamento: string | null;
    parcelas: number | null;
    data_pagamento: string | null;
  };
  documentos: DocEstado[];
}

const CORES: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  rejeitado: "bg-red-100 text-red-700",
};

const ROTULO: Record<string, string> = {
  pendente: "Pendente",
  enviado: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Reenviar",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Matricula = () => {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const pagamento = params.get("pagamento");
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const [forma, setForma] = useState("pix");
  const [parcelas, setParcelas] = useState("1");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    document.title = "Matrícula — Colégio Zampieri";
  }, []);

  const chamar = useCallback(
    async (acao: string, extra: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("matricula-portal", {
        body: { acao, token, ...extra },
      });
      if (error || data?.error) {
        return { erro: (data?.error as string) || "erro", data };
      }
      return { data };
    },
    [token],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { erro: e, data } = await chamar("estado");
    if (e) setErro(e);
    else setEstado(data as Estado);
    setCarregando(false);
  }, [chamar]);

  useEffect(() => {
    if (!token) {
      setErro("token_invalido");
      setCarregando(false);
      return;
    }
    carregar();
  }, [token, carregar]);

  const enviarArquivo = async (tipo: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Limite de 10 MB.", variant: "destructive" });
      return;
    }
    setEnviando(tipo);
    const base64: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const { erro: e, data } = await chamar("upload", {
      tipo,
      nome_arquivo: file.name,
      arquivo_base64: base64,
    });
    setEnviando(null);
    if (e) {
      toast({
        title: "Não foi possível enviar",
        description: e === "formato_invalido" ? "Envie PDF, JPG ou PNG." : "Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    setEstado(data as Estado);
    toast({ title: "Documento enviado!" });
  };

  const enviarAnalise = async () => {
    setAcaoEmCurso(true);
    const { erro: e, data } = await chamar("enviar_analise");
    setAcaoEmCurso(false);
    if (e) {
      toast({
        title: "Faltam documentos",
        description: (data?.faltando as string[])?.join(", ") || "Envie todos os documentos.",
        variant: "destructive",
      });
      return;
    }
    setEstado(data as Estado);
    toast({ title: "Documentação enviada para análise!" });
  };

  const irParaPagamento = async () => {
    setAcaoEmCurso(true);
    const { erro: e, data } = await chamar("checkout", {
      forma_pagamento: forma,
      parcelas: Number(parcelas),
      origin: window.location.origin,
    });
    setAcaoEmCurso(false);
    if (e || !data?.checkout_url) {
      toast({ title: "Não foi possível abrir o pagamento", variant: "destructive" });
      return;
    }
    window.location.href = data.checkout_url as string;
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zampieri-cream/30">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  if (erro || !estado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zampieri-cream/30 px-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-white p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
          <h1 className="font-serif text-xl font-bold text-zampieri-green-dark mt-4">
            Link inválido ou expirado
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Use o link enviado por WhatsApp ou e-mail após a Entrevista Familiar. Se precisar de
            ajuda, fale com a nossa equipe.
          </p>
          <Button asChild className="mt-5 bg-zampieri-green-dark hover:bg-zampieri-green">
            <a href="https://wa.me/5511939341503">Falar no WhatsApp</a>
          </Button>
        </div>
      </div>
    );
  }

  const m = estado.matricula;
  const concluida = m.status === "concluida";
  const podeEditarDocs = !concluida && !m.contrato_assinado;

  return (
    <div className="min-h-screen bg-zampieri-cream/30 py-8 px-4">
      <main className="max-w-2xl mx-auto space-y-5">
        <header className="rounded-xl bg-[#0F3D24] p-6 text-zampieri-cream">
          <p className="text-xs uppercase tracking-wide opacity-80">Matrícula</p>
          <h1 className="font-serif text-2xl font-bold">{estado.aluno}</h1>
          <p className="text-sm opacity-90 mt-1">
            {estado.serie} · {estado.turno} · protocolo {estado.protocolo}
          </p>
          {estado.desconto != null && (
            <p className="text-sm mt-2 font-medium">
              Desconto aprovado na mensalidade: {estado.desconto}%
            </p>
          )}
        </header>

        {pagamento === "sucesso" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Pagamento recebido! Assim que o Asaas confirmar, sua matrícula será concluída.
          </div>
        )}

        {concluida ? (
          <section className="rounded-xl border border-border bg-white p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
            <h2 className="font-serif text-xl font-bold text-zampieri-green-dark mt-4">
              Matrícula confirmada!
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Contrato assinado e pagamento aprovado. Seja bem-vindo à família Zampieri.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-border bg-white p-6 space-y-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-zampieri-green-dark">
                  1. Documentação
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envie os documentos abaixo em PDF, JPG ou PNG (até 10 MB cada).
                </p>
              </div>

              {podeEditarDocs && <GuiaEnvio />}


              <div className="space-y-3">
                {estado.documentos.map((d) => (
                  <div
                    key={d.tipo}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{d.label}</p>
                      {d.nome_arquivo && (
                        <p className="text-xs text-muted-foreground truncate">{d.nome_arquivo}</p>
                      )}
                      {d.motivo && <p className="text-xs text-destructive">{d.motivo}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[d.status]}`}
                      >
                        {ROTULO[d.status] ?? d.status}
                      </span>
                      {podeEditarDocs && d.status !== "aprovado" && (
                        <>
                          <input
                            ref={(el) => (inputs.current[d.tipo] = el)}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) enviarArquivo(d.tipo, f);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={enviando === d.tipo}
                            onClick={() => inputs.current[d.tipo]?.click()}
                          >
                            {enviando === d.tipo ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileUp className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {podeEditarDocs && m.status !== "documentos_aprovados" && (
                <Button
                  className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
                  disabled={acaoEmCurso || m.status === "documentos_em_analise"}
                  onClick={enviarAnalise}
                >
                  {m.status === "documentos_em_analise"
                    ? "Documentação em análise"
                    : "Enviar para análise"}
                </Button>
              )}
              {m.status === "documentos_aprovados" && (
                <p className="text-sm text-emerald-700">
                  Documentação aprovada. Estamos preparando o seu contrato.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-white p-6 space-y-3">
              <h2 className="font-serif text-lg font-bold text-zampieri-green-dark">
                2. Contrato
              </h2>
              {m.contrato_assinado ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Contrato assinado.
                </p>
              ) : m.contrato_gerado && m.link_contrato ? (
                <Button asChild className="bg-zampieri-green-dark hover:bg-zampieri-green">
                  <a href={m.link_contrato} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-2" /> Assinar contrato
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  O contrato é liberado após a conferência da documentação.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-white p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-zampieri-green-dark">
                3. Pagamento da matrícula
              </h2>
              {!m.contrato_assinado ? (
                <p className="text-sm text-muted-foreground">
                  O pagamento é liberado assim que o contrato for assinado.
                </p>
              ) : !m.valor_matricula ? (
                <p className="text-sm text-muted-foreground">
                  Valor em definição pela secretaria. Avisaremos assim que estiver liberado.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    Valor da matrícula:{" "}
                    <strong className="text-zampieri-green-dark">{brl(m.valor_matricula)}</strong>
                  </p>
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select
                      value={forma}
                      onValueChange={(v) => {
                        setForma(v);
                        if (v === "pix") setParcelas("1");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {m.permite_avista && <SelectItem value="pix">PIX (à vista)</SelectItem>}
                        <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {forma === "credit_card" && m.permite_parcelado && (
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Select value={parcelas} onValueChange={setParcelas}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {Array.from({ length: m.max_parcelas || 1 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x de {brl((m.valor_matricula as number) / n)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
                    disabled={acaoEmCurso}
                    onClick={irParaPagamento}
                  >
                    {acaoEmCurso ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pagar matrícula"}
                  </Button>
                </>
              )}
            </section>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas? Fale com a gente no{" "}
          <a href="https://wa.me/5511939341503" className="underline">
            WhatsApp (11) 93934-1503
          </a>
          .
        </p>
      </main>
    </div>
  );
};

export default Matricula;
