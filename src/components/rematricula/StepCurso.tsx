import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AlunoCompleto, TurnoDisponivel } from "./types";
import { formatBRL } from "./utils";

interface Props {
  aluno: AlunoCompleto;
  turno: string;
  responsavel: string;
  salvando: boolean;
  erroSalvar: string | null;
  onChange: (v: { turno: string; responsavel: string }) => void;
  onVoltar: () => void;
  onFinalizar: () => void;
}

export const StepCurso = ({
  aluno,
  turno,
  responsavel,
  salvando,
  erroSalvar,
  onChange,
  onVoltar,
  onFinalizar,
}: Props) => {
  const [turnos, setTurnos] = useState<TurnoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [concordou, setConcordou] = useState(false);
  const [valores, setValores] = useState<{
    valor_rematricula: number | null;
    valor_promocional: number | null;
    promocao_ate: string | null;
  } | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!aluno.curso_2027) {
        setTurnos([]);
        setLoading(false);
        return;
      }
      const [{ data }, { data: val }] = await Promise.all([
        supabase.rpc("rematricula_2027_turnos", { p_curso_2027: aluno.curso_2027 }),
        supabase
          .from("rematricula_valores_2027")
          .select("valor_rematricula, valor_promocional, promocao_ate")
          .eq("curso_2027", aluno.curso_2027)
          .eq("ativo", true)
          .maybeSingle(),
      ]);
      setTurnos((data as TurnoDisponivel[]) ?? []);
      setValores(val ?? null);
      setLoading(false);
    };
    carregar();
  }, [aluno.curso_2027]);

  const hoje = new Date().toISOString().slice(0, 10);
  const promoAtiva =
    !!valores?.valor_promocional &&
    (!valores.promocao_ate || valores.promocao_ate >= hoje) &&
    Number(valores.valor_promocional) < Number(valores.valor_rematricula ?? 0);
  const promoAte = valores?.promocao_ate
    ? valores.promocao_ate.split("-").reverse().join("/")
    : null;


  const opcoesResponsavel = [
    aluno.tem_mae?.toLowerCase() !== "não" && aluno.tem_mae?.toLowerCase() !== "nao"
      ? { valor: "mãe", label: aluno.nome_mae || "Mãe" }
      : null,
    aluno.tem_pai?.toLowerCase() !== "não" && aluno.tem_pai?.toLowerCase() !== "nao"
      ? { valor: "pai", label: aluno.nome_pai || "Pai" }
      : null,
  ].filter(Boolean) as { valor: string; label: string }[];

  const finalizar = () => {
    if (turnos.length > 0 && !turno) {
      setErro("Escolha o turno desejado para 2027.");
      return;
    }
    if (!responsavel) {
      setErro("Escolha quem será o responsável financeiro.");
      return;
    }
    if (!concordou) {
      setErro("É necessário confirmar que leu e concorda com a observação sobre a distribuição de turmas.");
      return;
    }
    setErro(null);
    onFinalizar();
  };

  if (!aluno.curso_2027) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Curso de 2027 ainda não definido</p>
            <p className="text-muted-foreground mt-1">
              Precisamos confirmar a turma deste aluno antes de seguir. Fale com a secretaria pelo{" "}
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
          </div>
        </div>
        <Button variant="outline" onClick={onVoltar} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Curso e condições para 2027</h2>
        <p className="text-sm text-muted-foreground mt-1">Confira os valores e escolha o turno.</p>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Curso em 2027</p>
          <p className="font-serif text-lg font-bold text-zampieri-green-dark">{aluno.curso_2027}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Mensalidade sem desconto</p>
            <p className="font-medium line-through text-muted-foreground">{formatBRL(aluno.valor_cheio)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Desconto</p>
            <p className="font-medium text-zampieri-green-dark">
              {Number(aluno.percentual_desconto ?? 0)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Mensalidade final</p>
            <p className="font-bold text-lg text-zampieri-green-dark">{formatBRL(aluno.valor_com_desconto)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vencimento</p>
            <p className="font-medium flex items-center gap-1">
              <CalendarDays className="w-4 h-4" /> dia {aluno.dia_vencimento ?? "—"}
            </p>
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-muted-foreground text-sm">Valor da rematrícula</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            {promoAtiva && (
              <span className="text-sm line-through text-muted-foreground">
                {formatBRL(valores?.valor_rematricula)}
              </span>
            )}
            <span className="font-bold text-lg text-zampieri-green-dark">
              {formatBRL(aluno.valor_rematricula)}
            </span>
          </div>
          {promoAtiva && promoAte && (
            <p className="text-xs font-medium text-zampieri-green-dark mt-1">
              Valor promocional válido até {promoAte}
            </p>
          )}
        </div>

      </div>

      <div className="space-y-2">
        <Label>Turno desejado</Label>
        <p className="text-sm text-foreground font-bold">
          A sua vaga para o período escolhido (manhã ou tarde) está garantida. A distribuição dos alunos para as turmas, será realizada em janeiro/27 pela equipe pedagógica. Não há possibilidade de escolha de turma pela família.
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-border p-3">
          <Checkbox
            id="concordou-turno"
            checked={concordou}
            onCheckedChange={(v) => setConcordou(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="concordou-turno" className="text-sm font-normal cursor-pointer leading-snug">
            Li e concordo com a observação acima sobre a distribuição de turmas.
          </Label>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando vagas…
          </div>
        ) : turnos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum turno cadastrado para esta turma. A secretaria confirmará o turno com você.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {turnos.map((t) => {
              const ativo = turno === t.turno;
              return (
                <button
                  key={t.turno}
                  type="button"
                  disabled={!t.disponivel}
                  onClick={() => onChange({ turno: t.turno, responsavel })}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    ativo
                      ? "border-zampieri-green-dark bg-zampieri-cream"
                      : "border-border hover:border-zampieri-green-dark"
                  } ${!t.disponivel ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="block font-semibold text-zampieri-green-dark">{t.turno}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.disponivel ? `${t.disponiveis} vaga(s) disponível(is)` : "Sem vagas"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Responsável financeiro</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {opcoesResponsavel.map((o) => {
            const ativo = responsavel === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => onChange({ turno, responsavel: o.valor })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  ativo
                    ? "border-zampieri-green-dark bg-zampieri-cream"
                    : "border-border hover:border-zampieri-green-dark"
                }`}
              >
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">{o.valor}</span>
                <span className="block font-semibold text-zampieri-green-dark truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(erro || erroSalvar) && <p className="text-sm text-destructive">{erro || erroSalvar}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1" disabled={salvando}>
          Voltar
        </Button>
        <Button
          onClick={finalizar}
          disabled={salvando}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Gerar e Assinar Contrato
        </Button>
      </div>
    </div>
  );
};
