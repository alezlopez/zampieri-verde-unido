import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, MapPin, Minus, Plus, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  horario: string | null;
  local: string | null;
  preco: number;
  preco_parcelado: number;
  max_parcelas: number;
  vagas_disponiveis: number;
  requer_autorizacao: boolean;
  tipo_evento: string;
}

interface Aluno {
  codigo_aluno: string;
  nome_aluno: string;
  curso: string | null;
}

interface Convidado {
  nome: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  celular: string;
}

const emptyConvidado = (): Convidado => ({
  nome: "",
  cpf: "",
  data_nascimento: "",
  email: "",
  celular: "",
});

const EventoCompra = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [nomeComprador, setNomeComprador] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"avista" | "parcelado">("avista");
  const [submitting, setSubmitting] = useState(false);

  // Alunos from DB
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);

  // Convidados
  const [convidados, setConvidados] = useState<Convidado[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/eventos/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchEvento = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setEvento(data as unknown as Evento);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  useEffect(() => {
    if (user?.user_metadata?.nome) {
      setNomeComprador(user.user_metadata.nome);
    }
  }, [user]);

  // Fetch alunos by CPF
  useEffect(() => {
    const fetchAlunos = async () => {
      if (!user?.user_metadata?.cpf) {
        setLoadingAlunos(false);
        return;
      }
      const cpf = (user.user_metadata.cpf as string).replace(/\D/g, "");
      const cpfDash = cpf.length === 11 ? `${cpf.slice(0, 9)}-${cpf.slice(9)}` : cpf;

      const { data } = await supabase
        .from("alunos_26")
        .select("codigo_aluno, nome_aluno, curso")
        .or(`cpf_pai.eq.${cpf},cpf_mae.eq.${cpf},cpf_pai.eq.${cpfDash},cpf_mae.eq.${cpfDash}`);

      if (data) {
        const validAlunos = data.filter((a) => a.codigo_aluno && a.nome_aluno) as Aluno[];
        setAlunos(validAlunos);
      }
      setLoadingAlunos(false);
    };
    if (user) fetchAlunos();
  }, [user]);

  const toggleAluno = (codigo: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const addConvidado = () => setConvidados((prev) => [...prev, emptyConvidado()]);
  const removeConvidado = (index: number) => setConvidados((prev) => prev.filter((_, i) => i !== index));
  const updateConvidado = (index: number, field: keyof Convidado, value: string) => {
    setConvidados((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const totalParticipantes = alunosSelecionados.length + convidados.length;

  const temParcelamento = evento ? evento.preco_parcelado > 0 && evento.max_parcelas > 1 : false;
  const precoUnitario =
    formaPagamento === "parcelado" && temParcelamento && evento
      ? evento.preco_parcelado
      : evento?.preco ?? 0;
  const total = precoUnitario * totalParticipantes;
  const valorParcela =
    temParcelamento && evento ? (evento.preco_parcelado * totalParticipantes) / evento.max_parcelas : 0;

  const handleComprar = async () => {
    if (!evento || !user) return;
    if (!nomeComprador.trim()) {
      toast({ title: "Informe o nome do comprador", variant: "destructive" });
      return;
    }
    if (totalParticipantes === 0) {
      toast({ title: "Selecione ao menos um participante", variant: "destructive" });
      return;
    }

    // Validate convidados
    for (let i = 0; i < convidados.length; i++) {
      const c = convidados[i];
      if (!c.nome.trim()) {
        toast({ title: `Informe o nome do convidado ${i + 1}`, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const records: any[] = [];

      // Alunos
      for (const codigo of alunosSelecionados) {
        const aluno = alunos.find((a) => a.codigo_aluno === codigo);
        records.push({
          evento_id: evento.id,
          user_id: user.id,
          nome_comprador: nomeComprador.trim(),
          codigo_aluno: codigo,
          quantidade: 1,
          status: "pendente",
          tipo_participante: "aluno",
          nome_participante: aluno?.nome_aluno || null,
        });
      }

      // Convidados
      for (const c of convidados) {
        records.push({
          evento_id: evento.id,
          user_id: user.id,
          nome_comprador: nomeComprador.trim(),
          codigo_aluno: null,
          quantidade: 1,
          status: "pendente",
          tipo_participante: "convidado",
          nome_participante: c.nome.trim(),
          cpf_participante: c.cpf || null,
          data_nascimento_participante: c.data_nascimento || null,
          email_participante: c.email || null,
          celular_participante: c.celular || null,
        });
      }

      const { error } = await supabase.from("ingressos").insert(records);
      if (error) throw error;

      toast({
        title: "Ingressos reservados!",
        description: `${records.length} ingresso(s) pendente(s) de pagamento.`,
      });
      navigate("/eventos/meus-ingressos");
    } catch (err: any) {
      toast({ title: "Erro ao reservar ingressos", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const permiteConvidados = evento.tipo_evento === "alunos_convidados";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8 px-4">
      <div className="container mx-auto max-w-lg">
        <Link to="/eventos" className="inline-flex items-center text-green-700 hover:text-green-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para eventos
        </Link>

        <Card className="border-green-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800">{evento.titulo}</CardTitle>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(evento.data_evento)} {evento.horario && `às ${evento.horario}`}
              </div>
              {evento.local && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {evento.local}
                </div>
              )}
            </div>
            {evento.requer_autorizacao && (
              <div className="flex items-center gap-2 mt-2 text-orange-600 bg-orange-50 rounded-md px-3 py-2 text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Este evento requer autorização. Após a compra, sua participação ficará sujeita à aprovação.</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome do comprador */}
            <div>
              <label className="text-sm font-medium">Nome do responsável (comprador) *</label>
              <Input value={nomeComprador} onChange={(e) => setNomeComprador(e.target.value)} placeholder="Seu nome completo" />
            </div>

            {/* Seleção de alunos */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Selecione os alunos</label>
              {loadingAlunos ? (
                <p className="text-sm text-muted-foreground">Carregando alunos...</p>
              ) : alunos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno encontrado para este CPF.</p>
              ) : (
                <div className="space-y-2">
                  {alunos.map((aluno) => (
                    <div
                      key={aluno.codigo_aluno}
                      className="flex items-center space-x-3 p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleAluno(aluno.codigo_aluno)}
                    >
                      <Checkbox
                        checked={alunosSelecionados.includes(aluno.codigo_aluno)}
                        onCheckedChange={() => toggleAluno(aluno.codigo_aluno)}
                      />
                      <div>
                        <p className="text-sm font-medium">{aluno.nome_aluno}</p>
                        <p className="text-xs text-muted-foreground">
                          Código: {aluno.codigo_aluno} {aluno.curso && `— ${aluno.curso}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Convidados */}
            {permiteConvidados && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Convidados extras</label>
                  <Button type="button" variant="outline" size="sm" onClick={addConvidado}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {convidados.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum convidado adicionado.</p>
                )}
                <div className="space-y-3">
                  {convidados.map((c, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-destructive"
                        onClick={() => removeConvidado(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <p className="text-xs font-medium text-muted-foreground">Convidado {idx + 1}</p>
                      <Input
                        placeholder="Nome completo *"
                        value={c.nome}
                        onChange={(e) => updateConvidado(idx, "nome", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="CPF"
                          value={c.cpf}
                          onChange={(e) => updateConvidado(idx, "cpf", e.target.value)}
                        />
                        <Input
                          type="date"
                          placeholder="Data de nascimento"
                          value={c.data_nascimento}
                          onChange={(e) => updateConvidado(idx, "data_nascimento", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Email"
                          value={c.email}
                          onChange={(e) => updateConvidado(idx, "email", e.target.value)}
                        />
                        <Input
                          placeholder="Celular"
                          value={c.celular}
                          onChange={(e) => updateConvidado(idx, "celular", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forma de pagamento */}
            {temParcelamento && totalParticipantes > 0 && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Forma de pagamento</label>
                <RadioGroup
                  value={formaPagamento}
                  onValueChange={(val) => setFormaPagamento(val as "avista" | "parcelado")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="avista" id="avista" />
                    <Label htmlFor="avista" className="cursor-pointer">
                      À vista — R$ {(evento.preco * totalParticipantes).toFixed(2).replace(".", ",")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcelado" id="parcelado" />
                    <Label htmlFor="parcelado" className="cursor-pointer">
                      {evento.max_parcelas}x de R$ {valorParcela.toFixed(2).replace(".", ",")} (Total: R${" "}
                      {(evento.preco_parcelado * totalParticipantes).toFixed(2).replace(".", ",")})
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground text-sm">Participantes:</span>
                <span className="font-medium">{totalParticipantes}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-green-700">
                  {total === 0 && totalParticipantes > 0 ? "Gratuito" : total === 0 ? "—" : `R$ ${total.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <Button
                onClick={handleComprar}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting || totalParticipantes === 0}
              >
                {submitting ? "Processando..." : "Reservar Ingressos"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                O pagamento será processado separadamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventoCompra;
