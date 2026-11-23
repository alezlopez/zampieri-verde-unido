import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useTurmas } from "@/hooks/useTurmas";
import { agruparTurmas, resumoTurmas } from "@/lib/turmas";

interface Props {
  restringir: boolean;
  onRestringir: (v: boolean) => void;
  selecionadas: string[];
  onChange: (turmas: string[]) => void;
}

/** Seleção das turmas que podem ir no evento (agrupadas por segmento e série). */
export function TurmasPermitidas({ restringir, onRestringir, selecionadas, onChange }: Props) {
  const { turmas, carregando } = useTurmas();
  const sel = new Set(selecionadas);
  // Turma salva no evento que não existe mais no cadastro (ex.: virada de ano) continua visível
  const todas = Array.from(new Set([...turmas, ...selecionadas]));
  const grupos = agruparTurmas(todas);

  const alternar = (cursos: string[], marcar: boolean) => {
    const novo = new Set(sel);
    cursos.forEach((c) => (marcar ? novo.add(c) : novo.delete(c)));
    onChange(Array.from(novo));
  };

  return (
    <div className="rounded-md border border-zampieri-green/30 bg-zampieri-cream/30 p-3 space-y-3">
      <div className="flex items-start space-x-2">
        <Checkbox id="restringir-turmas" checked={restringir} onCheckedChange={(c) => onRestringir(c === true)} />
        <div className="flex-1">
          <label htmlFor="restringir-turmas" className="text-sm font-medium cursor-pointer text-zampieri-green-dark">
            Restringir por turma
          </label>
          <p className="text-xs text-muted-foreground">
            Desmarcado, o evento vale para todas as turmas. Marcado, só alunos das turmas escolhidas podem ter ingresso de aluno.
          </p>
        </div>
      </div>

      {restringir && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Clique no nome da série (ex.: “7º Ano”) para marcar todas as turmas dela.</p>
          {carregando ? (
            <p className="text-xs text-muted-foreground">Carregando turmas…</p>
          ) : (
            grupos.map((g) => {
              const doSeg = g.series.flatMap((s) => s.turmas.map((t) => t.curso));
              const segTodo = doSeg.every((c) => sel.has(c));
              return (
                <div key={g.segmento} className="rounded-md border bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-zampieri-green-dark">{g.segmento}</p>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => alternar(doSeg, !segTodo)}>
                      {segTodo ? "Desmarcar segmento" : "Marcar segmento todo"}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {g.series.map((s) => {
                      const daSerie = s.turmas.map((t) => t.curso);
                      const serieToda = daSerie.every((c) => sel.has(c));
                      return (
                        <div key={s.serie} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => alternar(daSerie, !serieToda)}
                            className={`w-20 text-left text-xs font-medium underline-offset-2 hover:underline ${serieToda ? "text-zampieri-green-dark" : "text-muted-foreground"}`}
                            title={serieToda ? "Desmarcar a série" : "Marcar a série toda"}
                          >
                            {s.serie}
                          </button>
                          {s.turmas.map((t) => (
                            <label key={t.curso} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox checked={sel.has(t.curso)} onCheckedChange={(c) => alternar([t.curso], c === true)} />
                              {t.curta}
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <p className="text-xs">
            {selecionadas.length === 0 ? (
              <span className="text-destructive font-medium">Escolha pelo menos uma turma (ou desmarque “Restringir por turma”).</span>
            ) : (
              <span className="text-zampieri-green-dark">
                <strong>As famílias vão ver:</strong> para {resumoTurmas(selecionadas, turmas)}.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default TurmasPermitidas;
