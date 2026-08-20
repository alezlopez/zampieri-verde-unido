import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoZampieri from "@/assets/logo-zampieri.png";
import { supabase } from "@/integrations/supabase/client";
import { StepBusca } from "@/components/rematricula/StepBusca";
import { StepCanal, type CanalOtp } from "@/components/rematricula/StepCanal";
import { StepCodigo } from "@/components/rematricula/StepCodigo";
import type { AlunoResumo } from "@/components/rematricula/types";
import {
  brl,
  carregarDebitos,
  LoadingDebitos,
  StepDebitos,
  type Debito,
} from "@/components/renegociacao/StepDebitos";
import { StepPagamentoDebitos } from "@/components/renegociacao/StepPagamentoDebitos";

type Fase = "busca" | "canal" | "codigo" | "debitos" | "pagamento" | "processando" | "quitado";

const Renegociacao = () => {
  const [params, setParams] = useSearchParams();
  const [fase, setFase] = useState<Fase>("busca");
  const [resumo, setResumo] = useState<AlunoResumo | null>(null);
  const [canal, setCanal] = useState<CanalOtp | null>(null);
  const [dataNascimento, setDataNascimento] = useState<string>("");
  const [debitos, setDebitos] = useState<Debito[] | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const pagamentoRetorno = params.get("pagamento");

  const buscarDebitos = useCallback(
    async (idAluno: number, nascimento: string) => {
      setErro(null);
      setDebitos(null);
      try {
        const lista = await carregarDebitos(idAluno, nascimento);
        setDebitos(lista);
        const abertos = lista.filter((d) => !d.pago);
        setSelecionados(abertos.map((d) => d.row_id));
        return abertos.length === 0;
      } catch {
        setErro("Não foi possível carregar seus débitos agora. Tente novamente em instantes.");
        setDebitos([]);
        return false;
      }
    },
    [],
  );

  const aoValidar = async (nascimentoIso: string) => {
    if (!resumo) return;
    setDataNascimento(nascimentoIso);
    setFase("debitos");
    const quitado = await buscarDebitos(resumo.id_aluno, nascimentoIso);
    if (quitado) setFase("quitado");
    else if (pagamentoRetorno === "sucesso") setFase("processando");
  };

  // Polling enquanto o pagamento é confirmado pelo Asaas
  useEffect(() => {
    if (fase !== "processando" || !resumo || !dataNascimento) return;
    const t = setInterval(async () => {
      const quitado = await buscarDebitos(resumo.id_aluno, dataNascimento);
      if (quitado) {
        setFase("quitado");
        params.delete("pagamento");
        setParams(params, { replace: true });
      }
    }, 6000);
    return () => clearInterval(t);
  }, [fase, resumo, dataNascimento, buscarDebitos, params, setParams]);

  const totalAberto = (debitos ?? [])
    .filter((d) => !d.pago)
    .reduce((a, d) => a + Number(d.valor_a_vista || 0), 0);

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="bg-white border-b-[3px] border-zampieri-gold">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoZampieri} alt="Colégio Zampieri" className="h-11 w-auto" />
            <div>
              <h1 className="font-serif text-base md:text-lg font-bold text-zampieri-green-dark leading-tight">
                Colégio Zampieri
              </h1>
              <p className="text-[11px] md:text-xs text-zampieri-green-light">
                Regularização de débitos
              </p>
            </div>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <section className="bg-white rounded-xl border border-border p-5 md:p-6 shadow-sm">
          {fase === "busca" && (
            <StepBusca
              onSelecionar={(a) => {
                setResumo(a);
                setCanal(null);
                setFase("canal");
              }}
            />
          )}

          {fase === "canal" && resumo && (
            <StepCanal
              aluno={resumo}
              finalidade="renegociacao"
              onVoltar={() => setFase("busca")}
              onEnviado={(c) => {
                setCanal(c);
                setFase("codigo");
              }}
            />
          )}

          {fase === "codigo" && resumo && canal && (
            <StepCodigo
              aluno={resumo}
              canal={canal}
              finalidade="renegociacao"
              onVoltar={() => setFase("canal")}
              onValidado={aoValidar}
            />
          )}

          {fase === "debitos" && resumo && (
            debitos === null ? (
              <LoadingDebitos />
            ) : (
              <>
                {erro && <p className="text-sm text-destructive mb-3">{erro}</p>}
                <StepDebitos
                  nomeAluno={resumo.nome_aluno}
                  idAluno={resumo.id_aluno}
                  dataNascimento={dataNascimento}
                  debitos={debitos}
                  selecionados={selecionados}
                  onSelecionar={setSelecionados}
                  onAvancar={() => setFase("pagamento")}
                  onVoltar={() => setFase("busca")}
                />
              </>
            )
          )}

          {fase === "pagamento" && resumo && debitos && (
            <StepPagamentoDebitos
              idAluno={resumo.id_aluno}
              dataNascimento={dataNascimento}
              debitos={debitos}
              selecionados={selecionados}
              onVoltar={() => setFase("debitos")}
            />
          )}

          {fase === "processando" && (
            <div className="space-y-5 text-center py-4">
              <Clock className="w-10 h-10 text-zampieri-green-dark mx-auto" />
              <div>
                <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">
                  Pagamento em processamento
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Assim que o Asaas confirmar, esta tela é atualizada automaticamente.
                </p>
                {totalAberto > 0 && (
                  <p className="text-sm text-foreground mt-3">
                    Saldo em aberto no momento: <strong>{brl(totalAberto)}</strong>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...
              </div>
              <Button
                variant="outline"
                onClick={() => setFase("debitos")}
                className="w-full sm:w-auto"
              >
                Ver meus débitos
              </Button>
            </div>
          )}

          {fase === "quitado" && (
            <div className="space-y-5 text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-zampieri-green-dark mx-auto" />
              <div>
                <h2 className="font-serif text-2xl font-bold text-zampieri-green-dark">
                  Débitos quitados!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua rematrícula 2027 está liberada. Você já pode continuar o processo.
                </p>
              </div>
              <Button asChild className="bg-zampieri-green-dark hover:bg-zampieri-green w-full sm:w-auto">
                <Link to="/rematricula2027">Ir para a rematrícula 2027</Link>
              </Button>
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Dúvidas? Fale com a secretaria pelo{" "}
          <a
            href="https://wa.me/5511939341503"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zampieri-green-dark underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </main>
    </div>
  );
};

export default Renegociacao;
