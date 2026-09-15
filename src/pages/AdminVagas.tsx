import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Plus, Save, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Vaga {
  id: string;
  curso_2027: string;
  turno: string;
  max_vagas: number;
  ativo: boolean;
  matricula_habilitada: boolean;
  vagas_novos: number;
  ocupadas_rematricula: number;
  ocupadas_matricula: number;
  ocupadas: number;
  disponiveis: number;
  disponiveis_novos: number;
  lista_espera: number;
}

interface Rascunho {
  max_vagas: number;
  ativo: boolean;
  matricula_habilitada: boolean;
  vagas_novos: number;
}

const TURNOS = ["manhã", "tarde"];

const rotuloTurno = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

const AdminVagas = () => {
  const { toast } = useToast();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, Rascunho>>({});

  const [filtroCurso, setFiltroCurso] = useState<string>("todos");
  const [soLotadas, setSoLotadas] = useState(false);

  const [novoCurso, setNovoCurso] = useState("");
  const [novoTurno, setNovoTurno] = useState("manhã");
  const [novoMax, setNovoMax] = useState("30");
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("rematricula_2027_admin_vagas" as any);
    if (error) {
      toast({ title: "Não foi possível carregar as vagas", description: error.message, variant: "destructive" });
      setCarregando(false);
      return;
    }
    const lista = (data as Vaga[]) || [];
    setVagas(lista);
    setRascunho(
      Object.fromEntries(lista.map((v) => [v.id, { max_vagas: v.max_vagas, ativo: v.ativo }]))
    );
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    document.title = "Controle de Vagas 2027 — Colégio Zampieri";
    carregar();
  }, [carregar]);

  const cursos = useMemo(
    () => Array.from(new Set(vagas.map((v) => v.curso_2027))).sort(),
    [vagas]
  );

  const visiveis = useMemo(
    () =>
      vagas.filter((v) => {
        if (filtroCurso !== "todos" && v.curso_2027 !== filtroCurso) return false;
        if (soLotadas && v.disponiveis > 0) return false;
        return true;
      }),
    [vagas, filtroCurso, soLotadas]
  );

  const agrupadas = useMemo(() => {
    const mapa = new Map<string, Vaga[]>();
    visiveis.forEach((v) => {
      mapa.set(v.curso_2027, [...(mapa.get(v.curso_2027) || []), v]);
    });
    return Array.from(mapa.entries());
  }, [visiveis]);

  const totais = useMemo(() => {
    const ativas = vagas.filter((v) => v.ativo);
    return {
      max: ativas.reduce((s, v) => s + v.max_vagas, 0),
      ocupadas: ativas.reduce((s, v) => s + v.ocupadas, 0),
      livres: ativas.reduce((s, v) => s + v.disponiveis, 0),
    };
  }, [vagas]);

  const alterado = (v: Vaga) => {
    const r = rascunho[v.id];
    return !!r && (r.max_vagas !== v.max_vagas || r.ativo !== v.ativo);
  };

  const salvar = async (v: Vaga) => {
    const r = rascunho[v.id];
    if (!r) return;
    if (!Number.isFinite(r.max_vagas) || r.max_vagas < 0) {
      toast({ title: "Informe um número de vagas válido", variant: "destructive" });
      return;
    }
    setSalvando(v.id);
    const { error } = await supabase
      .from("vagas_2027")
      .update({ max_vagas: r.max_vagas, ativo: r.ativo })
      .eq("id", v.id);
    setSalvando(null);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vagas atualizadas" });
    carregar();
  };

  const remover = async (v: Vaga) => {
    if (v.ocupadas > 0) return;
    if (!confirm(`Remover ${v.curso_2027} — ${rotuloTurno(v.turno)}?`)) return;
    setSalvando(v.id);
    const { error } = await supabase.from("vagas_2027").delete().eq("id", v.id);
    setSalvando(null);
    if (error) {
      toast({ title: "Não foi possível remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Turma removida" });
    carregar();
  };

  const criar = async () => {
    const curso = novoCurso.trim();
    const max = Number(novoMax);
    if (!curso) {
      toast({ title: "Informe o curso", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(max) || max < 0) {
      toast({ title: "Informe um número de vagas válido", variant: "destructive" });
      return;
    }
    if (vagas.some((v) => v.curso_2027 === curso && v.turno === novoTurno)) {
      toast({ title: "Essa combinação de curso e turno já existe", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { error } = await supabase
      .from("vagas_2027")
      .insert({ curso_2027: curso, turno: novoTurno, max_vagas: max, ativo: true });
    setCriando(false);
    if (error) {
      toast({ title: "Não foi possível criar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Turma criada" });
    setNovoCurso("");
    setNovoMax("30");
    carregar();
  };

  const corLinha = (v: Vaga) => {
    if (!v.ativo) return "bg-muted/40";
    if (v.disponiveis === 0) return "bg-destructive/10";
    if (v.max_vagas > 0 && v.ocupadas / v.max_vagas >= 0.9) return "bg-amber-100/60";
    return "bg-white";
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
              Controle de Vagas 2027
            </h1>
            <p className="text-xs text-muted-foreground">
              Ocupação por curso e turno da rematrícula
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { rotulo: "Vagas totais", valor: totais.max },
            { rotulo: "Ocupadas", valor: totais.ocupadas },
            { rotulo: "Livres", valor: totais.livres },
          ].map((c) => (
            <div key={c.rotulo} className="rounded-lg border border-border bg-white p-4">
              <p className="text-xs text-muted-foreground">{c.rotulo}</p>
              <p className="text-2xl font-bold text-zampieri-green-dark">{c.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white p-4">
          <div className="min-w-56">
            <Select value={filtroCurso} onValueChange={setFiltroCurso}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os cursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os cursos</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={soLotadas} onCheckedChange={(v) => setSoLotadas(!!v)} />
            Mostrar apenas turmas lotadas
          </label>
        </div>

        {carregando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
          </div>
        ) : agrupadas.length === 0 ? (
          <p className="rounded-lg border border-border bg-white p-6 text-sm text-muted-foreground">
            Nenhuma turma encontrada com os filtros atuais.
          </p>
        ) : (
          <div className="space-y-5">
            {agrupadas.map(([curso, linhas]) => (
              <section key={curso} className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Users className="w-4 h-4 text-zampieri-green-dark" />
                  <h2 className="font-semibold text-zampieri-green-dark">{curso}</h2>
                </div>
                <div className="divide-y divide-border">
                  {linhas.map((v) => {
                    const r = rascunho[v.id] || { max_vagas: v.max_vagas, ativo: v.ativo };
                    return (
                      <div
                        key={v.id}
                        className={`flex flex-wrap items-center gap-4 px-4 py-3 ${corLinha(v)}`}
                      >
                        <span className="w-20 text-sm font-medium">{rotuloTurno(v.turno)}</span>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Máx.</Label>
                          <Input
                            type="number"
                            min={0}
                            value={r.max_vagas}
                            onChange={(e) =>
                              setRascunho((p) => ({
                                ...p,
                                [v.id]: { ...r, max_vagas: Number(e.target.value) },
                              }))
                            }
                            className="w-20 h-9"
                          />
                        </div>

                        <span className="text-sm text-muted-foreground">
                          Ocupadas: <strong className="text-foreground">{v.ocupadas}</strong>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Livres: <strong className="text-foreground">{v.disponiveis}</strong>
                        </span>

                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Switch
                            checked={r.ativo}
                            onCheckedChange={(val) =>
                              setRascunho((p) => ({ ...p, [v.id]: { ...r, ativo: val } }))
                            }
                          />
                          Ativo
                        </label>

                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => salvar(v)}
                            disabled={!alterado(v) || salvando === v.id}
                          >
                            {salvando === v.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" /> Salvar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remover(v)}
                            disabled={v.ocupadas > 0 || salvando === v.id}
                            title={
                              v.ocupadas > 0
                                ? "Não é possível remover uma turma com alunos"
                                : "Remover turma"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="rounded-lg border border-border bg-white p-4 space-y-3">
          <h2 className="font-semibold text-zampieri-green-dark">Adicionar turma</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Curso</Label>
              <Input
                value={novoCurso}
                onChange={(e) => setNovoCurso(e.target.value)}
                placeholder="Ex: Ensino Médio - 1º Ano"
                list="cursos-vagas"
              />
              <datalist id="cursos-vagas">
                {cursos.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Turno</Label>
              <Select value={novoTurno} onValueChange={setNovoTurno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {rotuloTurno(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Máx. vagas</Label>
              <Input
                type="number"
                min={0}
                value={novoMax}
                onChange={(e) => setNovoMax(e.target.value)}
              />
            </div>
            <Button onClick={criar} disabled={criando}>
              {criando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </>
              )}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminVagas;
