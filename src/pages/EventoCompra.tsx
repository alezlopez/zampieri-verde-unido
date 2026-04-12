import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, CheckCircle, MapPin, Minus, Plus, Trash2, UserPlus, AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  horario: string | null;
  local: string | null;
  imagem_url: string | null;
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

  // Pendentes check
  const [ingressosPendentes, setIngressosPendentes] = useState<any[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(true);

  // Countdown overlay
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [totalIngressosReservados, setTotalIngressosReservados] = useState(0);

  // Alunos que já possuem ingresso pago ou pendente para este evento
  const [alunosComIngresso, setAlunosComIngresso] = useState<string[]>([]);

  // Termos e autorização
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [autorizacaoAceita, setAutorizacaoAceita] = useState(false);
  const [termosDialogOpen, setTermosDialogOpen] = useState(false);
  const [autorizacaoDialogOpen, setAutorizacaoDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/eventos/login");
    }
  }, [user, authLoading, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      navigate("/eventos/meus-ingressos");
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate]);

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

  // Check for pending tickets + alunos que já têm ingresso
  useEffect(() => {
    const checkExistentes = async () => {
      if (!user || !id) {
        setLoadingPendentes(false);
        return;
      }
      // Buscar todos os ingressos não-cancelados do usuário para este evento
      const { data } = await supabase
        .from("ingressos")
        .select("id, nome_participante, checkout_url, status, codigo_aluno")
        .eq("evento_id", id)
        .eq("user_id", user.id)
        .in("status", ["pendente", "pago"]);

      if (data) {
        setIngressosPendentes(data.filter((i) => i.status === "pendente"));
        // Coletar códigos de alunos que já têm ingresso pago ou pendente
        const codigos = data
          .filter((i) => i.codigo_aluno)
          .map((i) => i.codigo_aluno as string);
        setAlunosComIngresso(codigos);
      }
      setLoadingPendentes(false);
    };
    checkExistentes();
  }, [user, id]);

  // Fetch alunos by CPF, fallback to email
  useEffect(() => {
    const fetchAlunos = async () => {
      let foundAlunos: Aluno[] = [];

      // Try by CPF first
      if (user?.user_metadata?.cpf) {
        const cpf = (user.user_metadata.cpf as string).replace(/\D/g, "");
        const { data } = await supabase.rpc("find_alunos_by_cpf", { p_cpf: cpf });
        if (data) {
          foundAlunos = data.filter((a: any) => a.codigo_aluno && a.nome_aluno) as Aluno[];
        }
      }

      // Fallback: lookup by user email
      if (foundAlunos.length === 0 && user?.email) {
        const { data } = await supabase.rpc("find_alunos_by_email" as any, { p_email: user.email });
        if (data) {
          foundAlunos = (data as any[]).filter((a: any) => a.codigo_aluno && a.nome_aluno) as Aluno[];
        }
      }

      setAlunos(foundAlunos);
      setLoadingAlunos(false);
    };
    if (user) fetchAlunos();
  }, [user]);

  const toggleAluno = (codigo: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  // Reset autorização quando muda seleção de alunos
  useEffect(() => {
    setAutorizacaoAceita(false);
    setAutorizacaoScrolledToEnd(false);
  }, [alunosSelecionados]);

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
      // Re-fetch vagas disponíveis para garantir dados atualizados
      const { data: eventoAtual } = await supabase
        .from("eventos")
        .select("vagas_disponiveis")
        .eq("id", evento.id)
        .single();

      if (eventoAtual) {
        setEvento((prev) => prev ? { ...prev, vagas_disponiveis: eventoAtual.vagas_disponiveis } : prev);
        if (eventoAtual.vagas_disponiveis < totalParticipantes) {
          toast({
            title: "Vagas insuficientes",
            description: `Restam apenas ${eventoAtual.vagas_disponiveis} vaga(s) disponível(is).`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }
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

      const { data: insertedData, error } = await supabase.from("ingressos").insert(records).select("id");
      if (error) throw error;

      const insertedIds = insertedData?.map((r: any) => r.id) || [];

      // Send to webhook
      // Send to webhook (fire and forget, n8n handles checkout_url/checkout_id update)
      try {
        let imagemBase64: string | null = null;
        if (evento.imagem_url) {
          try {
            const imgResponse = await fetch(evento.imagem_url);
            const blob = await imgResponse.blob();
            imagemBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (imgErr) {
            console.error("Erro ao converter imagem:", imgErr);
          }
        }

        let imagemExtensao: string | null = null;
        let imagemNomeArquivo: string | null = null;
        if (evento.imagem_url) {
          const urlPath = evento.imagem_url.split('?')[0];
          const ext = urlPath.split('.').pop()?.toLowerCase() || null;
          if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
            imagemExtensao = ext;
          }
          const segments = urlPath.split('/');
          imagemNomeArquivo = decodeURIComponent(segments[segments.length - 1]) || null;
        }

        await fetch("https://n8n.colegiozampieri.com/webhook/20c571e8-7740-40c6-add5-579e40a25ffc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "key_eventos": "qTAA7iUixsaRt9P4bhDB9zUYTFmuamfmeFxJNmk",
          },
          body: JSON.stringify({
            evento: { ...evento, imagem_base64: imagemBase64, imagem_extensao: imagemExtensao, imagem_nome_arquivo: imagemNomeArquivo },
            comprador: nomeComprador.trim(),
            cpf_responsavel: user.user_metadata?.cpf ? (user.user_metadata.cpf as string).replace(/\D/g, "") : null,
            user_id: user.id,
            participantes: records,
            ingresso_ids: insertedIds,
            forma_pagamento: formaPagamento,
            total,
          }),
        });
      } catch (webhookErr) {
        console.error("Webhook error:", webhookErr);
      }

      setTotalIngressosReservados(records.length);
      setRedirectCountdown(10);
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

  if (evento.vagas_disponiveis <= 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center border-red-200 shadow-lg">
          <CardContent className="py-10 space-y-4">
            <div className="text-5xl">🚫</div>
            <h2 className="text-2xl font-bold text-red-700">Evento Esgotado</h2>
            <p className="text-muted-foreground">
              Este evento não possui mais vagas disponíveis.
            </p>
            <Link to="/eventos">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para eventos
              </Button>
            </Link>
          </CardContent>
        </Card>
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
      {/* Countdown overlay */}
      {redirectCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800">Ingressos reservados!</h3>
            <p className="text-sm text-muted-foreground">
              {totalIngressosReservados} ingresso(s) reservado(s) com sucesso.<br />
              Aguarde o link de pagamento.
            </p>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-700">{redirectCountdown}</div>
              <Progress value={((10 - redirectCountdown) / 10) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Redirecionando para Meus Ingressos em {redirectCountdown} segundo{redirectCountdown !== 1 ? "s" : ""}...
              </p>
            </div>
          </div>
        </div>
      )}
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
                  {alunos.map((aluno) => {
                    const jaTemIngresso = alunosComIngresso.includes(aluno.codigo_aluno);
                    return (
                      <div
                        key={aluno.codigo_aluno}
                        className={`flex items-center space-x-3 p-2 rounded-md border ${jaTemIngresso ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50 cursor-pointer"}`}
                        onClick={() => !jaTemIngresso && toggleAluno(aluno.codigo_aluno)}
                      >
                        <Checkbox
                          checked={alunosSelecionados.includes(aluno.codigo_aluno)}
                          onCheckedChange={() => !jaTemIngresso && toggleAluno(aluno.codigo_aluno)}
                          disabled={jaTemIngresso}
                        />
                        <div>
                          <p className="text-sm font-medium">{aluno.nome_aluno}</p>
                          <p className="text-xs text-muted-foreground">
                            Código: {aluno.codigo_aluno} {aluno.curso && `— ${aluno.curso}`}
                          </p>
                          {jaTemIngresso && (
                            <p className="text-xs text-orange-600 font-medium">✅ Já possui ingresso para este evento</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

            {/* Aviso de cancelamento automático */}
            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  A reserva do ingresso será cancelada automaticamente após <strong>2 horas</strong> caso o pagamento não seja realizado, sendo necessário uma nova reserva para participação mediante a disponibilidade de vagas.
                </p>
              </div>
            </div>

            {/* Termos de compra obrigatórios */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-700" />
                <label className="text-sm font-medium text-green-800">Termos de Compra e Participação</label>
              </div>
              <div
                ref={termosRef}
                onScroll={handleTermosScroll}
                className="max-h-48 overflow-y-auto border rounded-md p-3 text-xs text-gray-700 bg-gray-50 space-y-3"
              >
                <p className="font-bold text-sm">TERMO DE COMPRA, PARTICIPAÇÃO EM EVENTOS E TRATAMENTO DE DADOS PESSOAIS</p>
                <p className="font-semibold">Colégio Zampieri</p>
                <p>Razão Social: Colégio Zampieri<br/>CNPJ: 55.704.506/0001-73<br/>Endereço: Rua dos Acarapevas, 80, Balneário São Francisco, São Paulo – SP<br/>E-mail para contato: financeiro@colegiozampieri.com.br</p>
                
                <p className="font-bold">1. OBJETO</p>
                <p>O presente Termo estabelece as condições para a reserva, compra e participação em eventos promovidos pelo Colégio Zampieri, realizados nas dependências da instituição ou em locais externos previamente informados.</p>
                <p>Ao prosseguir com a reserva e/ou pagamento, o responsável declara estar ciente e de acordo com todas as condições descritas neste Termo.</p>

                <p className="font-bold">2. ACESSO AO SISTEMA E IDENTIFICAÇÃO DOS PARTICIPANTES</p>
                <p>A aquisição de ingressos será realizada por meio da plataforma online de eventos do Colégio Zampieri, mediante login e senha do responsável.</p>
                <p>Ao acessar o sistema:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Os alunos vinculados ao CPF do responsável serão exibidos automaticamente</li>
                  <li>O responsável deverá selecionar corretamente os alunos participantes</li>
                  <li>O responsável declara que os dados cadastrados são verdadeiros e atualizados</li>
                </ul>
                <p>O Colégio Zampieri não se responsabiliza por informações incorretas fornecidas pelo usuário.</p>

                <p className="font-bold">3. RESERVA DE VAGAS</p>
                <p>Ao selecionar os participantes e confirmar a participação, será criada uma reserva temporária da vaga no evento.</p>
                <p>Essa reserva:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Terá validade de 2 (duas) horas</li>
                  <li>Será cancelada automaticamente caso o pagamento não seja realizado dentro desse prazo</li>
                  <li>Liberará automaticamente a vaga para outros participantes</li>
                </ul>
                <p>Após o cancelamento automático: Será necessário realizar nova reserva, mediante disponibilidade de vagas. O Colégio Zampieri não garante disponibilidade de vagas após o cancelamento automático da reserva.</p>

                <p className="font-bold">4. PAGAMENTO E CONFIRMAÇÃO DA PARTICIPAÇÃO</p>
                <p>A participação no evento será considerada confirmada somente após: Realização do pagamento, confirmação do pagamento pelo sistema e liberação automática do ingresso.</p>

                <p className="font-bold">5. DISPONIBILIZAÇÃO DO INGRESSO</p>
                <p>Após a confirmação do pagamento, o ingresso será gerado automaticamente, disponibilizado na área logada do usuário e acessível dentro do sistema de eventos. O responsável deverá garantir o acesso ao ingresso no momento do evento, quando solicitado.</p>

                <p className="font-bold">6. POLÍTICA DE CANCELAMENTO E ESTORNO</p>
                <p>O cancelamento com solicitação de estorno poderá ser realizado até 24 (vinte e quatro) horas antes do início do evento. A solicitação deverá ser enviada exclusivamente para: financeiro@colegiozampieri.com.br</p>
                <p>A solicitação deverá conter: Nome do responsável, Nome do aluno, Nome do evento, Comprovante de pagamento.</p>
                <p>Após o prazo de 24 horas que antecede o início do evento: Não haverá possibilidade de estorno ou cancelamento.</p>
                <p>O estorno será realizado pelo mesmo meio de pagamento utilizado, dentro dos prazos operacionais das instituições financeiras.</p>

                <p className="font-bold">7. AUSÊNCIA NO EVENTO</p>
                <p>A ausência do participante no evento, por qualquer motivo, não dará direito a reembolso, exceto quando solicitado dentro do prazo estabelecido neste Termo.</p>

                <p className="font-bold">8. ALTERAÇÃO OU CANCELAMENTO DO EVENTO</p>
                <p>O Colégio Zampieri poderá alterar data, horário ou local do evento por motivos operacionais ou de força maior, ou cancelar o evento quando necessário. Em caso de cancelamento por parte do Colégio Zampieri, o valor pago será integralmente reembolsado.</p>

                <p className="font-bold">9. EVENTOS EXTERNOS E EXCURSÕES</p>
                <p>Para eventos realizados fora das dependências da escola (excursões, passeios ou atividades externas), o responsável declara estar ciente de que:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>O deslocamento poderá ocorrer por transporte contratado pela instituição</li>
                  <li>Os participantes deverão cumprir os horários definidos pela organização</li>
                  <li>O retorno antecipado do participante poderá depender de disponibilidade logística e poderá gerar custos adicionais ao responsável</li>
                  <li>A participação está condicionada ao cumprimento das normas de segurança e disciplina</li>
                </ul>
                <p>O responsável declara estar ciente dos riscos inerentes a deslocamentos e atividades externas.</p>

                <p className="font-bold">10. COMPORTAMENTO E RESPONSABILIDADE DISCIPLINAR</p>
                <p>O responsável declara estar ciente de que: O aluno deverá respeitar as normas disciplinares da escola. Condutas inadequadas poderão resultar na retirada do aluno do evento. Em casos graves, poderá ser solicitado que o responsável realize a retirada do participante. Não haverá reembolso em caso de retirada por comportamento inadequado.</p>

                <p className="font-bold">11. CONDIÇÕES DE SAÚDE E SEGURANÇA</p>
                <p>O responsável declara que: O aluno está apto física e emocionalmente para participar das atividades. Informações médicas relevantes deverão ser previamente comunicadas à escola. Medicamentos pessoais deverão ser identificados e entregues conforme orientação da instituição. O Colégio Zampieri não se responsabiliza por omissão de informações médicas relevantes.</p>

                <p className="font-bold">12. USO DE IMAGEM</p>
                <p>Ao realizar a compra, o responsável autoriza o uso da imagem e voz do participante, capturados durante o evento, para fins educacionais, institucionais, publicitários, divulgação em redes sociais, materiais impressos e digitais da instituição. Caso não autorize o uso de imagem, o responsável deverá comunicar formalmente antes da realização do evento.</p>

                <p className="font-bold">13. OBJETOS PESSOAIS</p>
                <p>O Colégio Zampieri não se responsabiliza por perda, furto, extravio ou danos a objetos pessoais. Recomenda-se evitar o envio de objetos de valor.</p>

                <p className="font-bold">14. TRATAMENTO DE DADOS PESSOAIS — LGPD</p>
                <p>Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), o responsável declara ciência de que os dados pessoais coletados (nome, CPF, dados de contato, dados de pagamento etc.) serão utilizados para identificação, gestão de inscrições, processamento de pagamentos, controle de acesso e comunicação. Os dados poderão ser compartilhados com empresas de pagamento, transporte e prestadores de serviços. O titular poderá solicitar acesso, correção ou exclusão de dados pelo e-mail financeiro@colegiozampieri.com.br.</p>

                <p className="font-bold">15. LIMITAÇÃO DE RESPONSABILIDADE</p>
                <p>O Colégio Zampieri não se responsabiliza por informações incorretas fornecidas pelo usuário, problemas de acesso à internet ou situações de força maior.</p>

                <p className="font-bold">16. ACEITE DO TERMO</p>
                <p>Ao prosseguir com a reserva e/ou pagamento, o responsável declara que:</p>
                <p>✔ Leu integralmente este Termo<br/>✔ Está ciente das regras estabelecidas<br/>✔ Concorda com todas as condições descritas<br/>✔ Autoriza o tratamento de dados pessoais conforme descrito</p>
                <p>O aceite eletrônico deste Termo possui validade jurídica equivalente à assinatura física.</p>
              </div>
              {!termosScrolledToEnd && (
                <p className="text-xs text-amber-600 font-medium">↓ Role até o final do texto para habilitar o aceite</p>
              )}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="termos"
                  checked={termosAceitos}
                  onCheckedChange={(checked) => setTermosAceitos(checked === true)}
                  disabled={!termosScrolledToEnd}
                />
                <label
                  htmlFor="termos"
                  className={`text-xs cursor-pointer ${!termosScrolledToEnd ? "text-muted-foreground" : "text-foreground"}`}
                >
                  Li e aceito os Termos de Compra, Participação em Eventos e Tratamento de Dados Pessoais.
                </label>
              </div>
            </div>

            {/* Autorização (somente se evento requer) */}
            {evento.requer_autorizacao && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-700" />
                  <label className="text-sm font-medium text-green-800">Autorização de Participação</label>
                </div>
                <div
                  ref={autorizacaoRef}
                  onScroll={handleAutorizacaoScroll}
                  className="max-h-40 overflow-y-auto border rounded-md p-3 text-xs text-gray-700 bg-gray-50 space-y-3"
                >
                  {alunosSelecionados.length === 0 ? (
                    <p className="text-muted-foreground italic">Selecione ao menos um aluno acima para visualizar o texto da autorização.</p>
                  ) : (
                    alunosSelecionados.map((codigo) => {
                      const aluno = alunos.find((a) => a.codigo_aluno === codigo);
                      const cpfResp = user?.user_metadata?.cpf
                        ? (user.user_metadata.cpf as string).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                        : "[CPF não informado]";
                      return (
                        <p key={codigo}>
                          Eu <strong>{nomeComprador || "[nome do responsável]"}</strong>, portador do CPF nº <strong>{cpfResp}</strong>, no papel de responsável pelo aluno(a) <strong>{aluno?.nome_aluno || codigo}</strong>, autorizo a sua participação no evento: <strong>{evento.titulo}</strong>, a ser realizado no dia <strong>{formatDate(evento.data_evento)}</strong>{evento.horario ? <>, às <strong>{evento.horario}</strong></> : ""}.
                        </p>
                      );
                    })
                  )}
                </div>
                {!autorizacaoScrolledToEnd && alunosSelecionados.length > 0 && (
                  <p className="text-xs text-amber-600 font-medium">↓ Role até o final do texto para habilitar o aceite</p>
                )}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="autorizacao"
                    checked={autorizacaoAceita}
                    onCheckedChange={(checked) => setAutorizacaoAceita(checked === true)}
                    disabled={!autorizacaoScrolledToEnd || alunosSelecionados.length === 0}
                  />
                  <label
                    htmlFor="autorizacao"
                    className={`text-xs cursor-pointer ${!autorizacaoScrolledToEnd || alunosSelecionados.length === 0 ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    Autorizo a participação conforme descrito acima.
                  </label>
                </div>
              </div>
            )}

            {/* Total e botão */}
            <div className="border-t pt-4">
              {ingressosPendentes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 space-y-3 mb-4">
                  <p className="text-sm font-medium text-yellow-800">
                    ⚠️ Você possui {ingressosPendentes.length} ingresso(s) pendente(s) de pagamento para este evento.
                  </p>
                  <div className="flex gap-2">
                    {ingressosPendentes[0]?.checkout_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                        onClick={() => window.open(ingressosPendentes[0].checkout_url, "_blank")}
                      >
                        Pagar agora
                      </Button>
                    )}
                    <Link to="/eventos/meus-ingressos">
                      <Button variant="link" size="sm" className="text-yellow-800">
                        Ver meus ingressos →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground text-sm">Participantes:</span>
                <span className="font-medium">{totalParticipantes}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted-foreground text-sm">Vagas disponíveis:</span>
                <span className={`font-medium ${evento.vagas_disponiveis < 5 ? "text-red-600" : "text-green-700"}`}>
                  {evento.vagas_disponiveis}
                </span>
              </div>
              {totalParticipantes > evento.vagas_disponiveis && (
                <p className="text-sm text-red-600 font-medium mb-2">
                  ⚠️ Não há vagas suficientes para {totalParticipantes} participante(s).
                </p>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-green-700">
                  {total === 0 && totalParticipantes > 0 ? "Gratuito" : total === 0 ? "—" : `R$ ${total.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <Button
                onClick={handleComprar}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={
                  submitting ||
                  totalParticipantes === 0 ||
                  totalParticipantes > evento.vagas_disponiveis ||
                  !termosAceitos ||
                  (evento.requer_autorizacao && !autorizacaoAceita)
                }
              >
                {submitting ? "Processando..." : "Reservar Ingressos"}
              </Button>
              {(!termosAceitos || (evento.requer_autorizacao && !autorizacaoAceita)) && totalParticipantes > 0 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  {!termosAceitos ? "Aceite os termos de compra para continuar." : "Aceite a autorização de participação para continuar."}
                </p>
              )}
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
