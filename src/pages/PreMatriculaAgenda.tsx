import { useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Regra {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  capacidade: number;
  ativo: boolean;
}

interface Bloqueio {
  id: string;
  data: string;
  motivo: string | null;
}

const DIAS = [
  { valor: 0, nome: "Domingo" },
  { valor: 1, nome: "Segunda-feira" },
  { valor: 2, nome: "Terça-feira" },
  { valor: 3, nome: "Quarta-feira" },
  { valor: 4, nome: "Quinta-feira" },
  { valor: 5, nome: "Sexta-feira" },
  { valor: 6, nome: "Sábado" },
];

const hhmm = (v: string) => (v || "").slice(0, 5);

const PreMatriculaAgenda = () => {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [novaData, setNovaData] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");

  const carregar = async () => {
    setCarregando(true);
    const [r1, r2] = await Promise.all([
      supabase
        .from("prematricula_agenda_regras")
        .select("id, dia_semana, hora_inicio, hora_fim, duracao_min, capacidade, ativo")
        .order("dia_semana"),
      supabase
        .from("prematricula_agenda_bloqueios")
        .select("id, data, motivo")
        .order("data"),
    ]);
    if (r1.error || r2.error) {
      toast({
        title: "Erro ao carregar a agenda",
        description: r1.error?.message || r2.error?.message,
        variant: "destructive",
      });
    }
    setRegras((r1.data as Regra[]) || []);
    setBloqueios((r2.data as Bloqueio[]) || []);
    setCarregando(false);
  };

  useEffect(() => {
    document.title = "Agenda de entrevistas — Colégio Zampieri";
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regrasDoDia = (dia: number) =>
    regras
      .filter((r) => r.dia_semana === dia)
      .sort((a, b) => hhmm(a.hora_inicio).localeCompare(hhmm(b.hora_inicio)));

  const atualizarLocal = (id: string, campo: keyof Regra, valor: unknown) => {
    setRegras((prev) => prev.map((r) => (r.id === id ? ({ ...r, [campo]: valor } as Regra) : r)));
  };

  const salvarRegra = async (id: string) => {
    const regra = regras.find((r) => r.id === id);
    if (!regra) return;
    setSalvando(id);
    const { error } = await supabase
      .from("prematricula_agenda_regras")
      .update({
        duracao_min: Number(regra.duracao_min) || 30,
        capacidade: Number(regra.capacidade) || 1,
        ativo: regra.ativo,
      })
      .eq("id", id);
    setSalvando(null);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Horários atualizados" });
  };

  const criarDia = async (dia: number) => {
    setSalvando(`dia-${dia}`);
    const { data, error } = await supabase
      .from("prematricula_agenda_regras")
      .insert(
        JANELAS.map(([ini, fim]) => ({
          dia_semana: dia,
          hora_inicio: ini,
          hora_fim: fim,
          duracao_min: 30,
          capacidade: 1,
          ativo: true,
        })),
      )
      .select("id, dia_semana, hora_inicio, hora_fim, duracao_min, capacidade, ativo");
    setSalvando(null);
    if (error) {
      toast({ title: "Não foi possível criar", description: error.message, variant: "destructive" });
      return;
    }
    setRegras((prev) => [...prev, ...((data as Regra[]) || [])].sort((a, b) => a.dia_semana - b.dia_semana));
  };

  const removerDia = async (dia: number) => {
    const ids = regrasDoDia(dia).map((r) => r.id);
    if (!ids.length) return;
    const { error } = await supabase.from("prematricula_agenda_regras").delete().in("id", ids);
    if (error) {
      toast({ title: "Não foi possível remover", description: error.message, variant: "destructive" });
      return;
    }
    setRegras((prev) => prev.filter((r) => !ids.includes(r.id)));
  };

  const adicionarBloqueio = async () => {
    if (!novaData) return;
    setSalvando("bloqueio");
    const { data, error } = await supabase
      .from("prematricula_agenda_bloqueios")
      .insert({ data: novaData, motivo: novoMotivo || null })
      .select("id, data, motivo")
      .single();
    setSalvando(null);
    if (error) {
      toast({ title: "Não foi possível bloquear", description: error.message, variant: "destructive" });
      return;
    }
    setBloqueios((prev) => [...prev, data as Bloqueio].sort((a, b) => a.data.localeCompare(b.data)));
    setNovaData("");
    setNovoMotivo("");
  };

  const removerBloqueio = async (id: string) => {
    const { error } = await supabase.from("prematricula_agenda_bloqueios").delete().eq("id", id);
    if (error) {
      toast({ title: "Não foi possível remover", description: error.message, variant: "destructive" });
      return;
    }
    setBloqueios((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
              Agenda da Entrevista Familiar
            </h1>
            <p className="text-sm text-muted-foreground">
              Defina os horários que aparecem para as famílias agendarem.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {carregando ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando agenda...
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-semibold text-zampieri-green-dark">Horários por dia da semana</h2>
              {DIAS.map((dia) => {
                const regra = regraDoDia(dia.valor);
                return (
                  <div
                    key={dia.valor}
                    className="rounded-lg border border-border bg-white p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{dia.nome}</span>
                      {regra ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={regra.ativo}
                            onCheckedChange={(v) => atualizarLocal(dia.valor, "ativo", v)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {regra.ativo ? "Aberto" : "Fechado"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerDia(regra.id)}
                            aria-label={`Remover regra de ${dia.nome}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => criarDia(dia.valor)}
                          disabled={salvando === `dia-${dia.valor}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Abrir este dia
                        </Button>
                      )}
                    </div>

                    {regra && (
                      <div className="grid gap-3 sm:grid-cols-5 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Início</Label>
                          <Input
                            type="time"
                            value={hhmm(regra.hora_inicio)}
                            onChange={(e) => atualizarLocal(dia.valor, "hora_inicio", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fim</Label>
                          <Input
                            type="time"
                            value={hhmm(regra.hora_fim)}
                            onChange={(e) => atualizarLocal(dia.valor, "hora_fim", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duração (min)</Label>
                          <Input
                            type="number"
                            min={10}
                            step={5}
                            value={regra.duracao_min}
                            onChange={(e) => atualizarLocal(dia.valor, "duracao_min", Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vagas por horário</Label>
                          <Input
                            type="number"
                            min={1}
                            value={regra.capacidade}
                            onChange={(e) => atualizarLocal(dia.valor, "capacidade", Number(e.target.value))}
                          />
                        </div>
                        <Button
                          onClick={() => salvarDia(dia.valor)}
                          disabled={salvando === `dia-${dia.valor}`}
                        >
                          {salvando === `dia-${dia.valor}` && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold text-zampieri-green-dark">Datas bloqueadas</h2>
              <div className="rounded-lg border border-border bg-white p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Motivo (opcional)</Label>
                    <Input
                      value={novoMotivo}
                      onChange={(e) => setNovoMotivo(e.target.value)}
                      placeholder="Ex: Feriado"
                    />
                  </div>
                  <Button onClick={adicionarBloqueio} disabled={!novaData || salvando === "bloqueio"}>
                    {salvando === "bloqueio" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Bloquear data
                  </Button>
                </div>

                {bloqueios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma data bloqueada.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {bloqueios.map((b) => (
                      <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          {b.data.split("-").reverse().join("/")}
                          {b.motivo ? ` — ${b.motivo}` : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerBloqueio(b.id)}
                          aria-label="Remover bloqueio"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default PreMatriculaAgenda;
