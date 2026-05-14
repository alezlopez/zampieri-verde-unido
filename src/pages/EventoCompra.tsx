import { useEffect, useState } from "react";
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
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { friendlyCheckoutError } from "@/lib/checkoutErrors";

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
  publico_alvo?: string;
  meia_entrada_habilitada?: boolean;
  preco_meia?: number;
  preco_meia_parcelado?: number;
  categorias_meia?: string[];
  aluno_cortesia?: boolean;
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

interface MeiaConfig {
  tipo_ingresso: "inteira" | "meia";
  categoria_meia: string;
  declaracao: boolean;
}

const CATEGORIAS_LABELS: Record<string, string> = {
  estudante: "Estudante",
  idoso: "Idoso (60+)",
  pcd: "PCD",
  pcd_acompanhante: "Acompanhante de PCD",
  professor: "Professor rede pública",
};

const emptyMeiaConfig = (): MeiaConfig => ({ tipo_ingresso: "inteira", categoria_meia: "", declaracao: false });

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

  // Tipo do comprador (aluno x externo)
  const [tipoComprador, setTipoComprador] = useState<"aluno" | "externo" | null>(null);

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

  // Comprador como participante
  const [comprarParaSi, setComprarParaSi] = useState(false);
  const [comprarParaSiTouched, setComprarParaSiTouched] = useState(false);
  const [compradorExternoData, setCompradorExternoData] = useState<{
    cpf?: string; email?: string; celular?: string; data_nascimento?: string;
  } | null>(null);

  // Form de auto-cadastro do comprador (quando não há aluno vinculado e não é externo cadastrado)
  const [compradorForm, setCompradorForm] = useState<{ cpf: string; celular: string; data_nascimento: string }>({
    cpf: "", celular: "", data_nascimento: "",
  });

  // Meia-entrada por participante (chave: `aluno-<codigo>`, `convidado-<idx>` ou `comprador-self`)
  const [meiaConfigs, setMeiaConfigs] = useState<Record<string, MeiaConfig>>({});
  const [meiaInfo, setMeiaInfo] = useState<{ vagas_meia_total: number; meias_vendidas: number; meias_disponiveis: number } | null>(null);

  const setMeiaField = (key: string, patch: Partial<MeiaConfig>) => {
    setMeiaConfigs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyMeiaConfig()), ...patch },
    }));
  };
  const getMeia = (key: string): MeiaConfig => meiaConfigs[key] ?? emptyMeiaConfig();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/eventos/login");
    }
  }, [user, authLoading, navigate]);

  // Detecta se é comprador externo + carrega dados completos
  useEffect(() => {
    const detect = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("compradores_externos")
        .select("id, nome, cpf, email, celular, data_nascimento")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setTipoComprador("externo");
        if (data.nome && !nomeComprador) setNomeComprador(data.nome);
        setCompradorExternoData({
          cpf: data.cpf || undefined,
          email: data.email || undefined,
          celular: data.celular || undefined,
          data_nascimento: data.data_nascimento || undefined,
        });
      } else {
        setTipoComprador("aluno");
      }
    };
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // Fetch alunos by CPF, fallback to email (apenas se for aluno)
  useEffect(() => {
    const fetchAlunos = async () => {
      if (tipoComprador === "externo") {
        setAlunos([]);
        setLoadingAlunos(false);
        return;
      }
      let foundAlunos: Aluno[] = [];

      if (user?.user_metadata?.cpf) {
        const cpf = (user.user_metadata.cpf as string).replace(/\D/g, "");
        const { data } = await supabase.rpc("find_alunos_by_cpf", { p_cpf: cpf });
        if (data) {
          foundAlunos = data.filter((a: any) => a.codigo_aluno && a.nome_aluno) as Aluno[];
        }
      }

      if (foundAlunos.length === 0 && user?.email) {
        const { data } = await supabase.rpc("find_alunos_by_email" as any, { p_email: user.email });
        if (data) {
          foundAlunos = (data as any[]).filter((a: any) => a.codigo_aluno && a.nome_aluno) as Aluno[];
        }
      }

      setAlunos(foundAlunos);
      setLoadingAlunos(false);
    };
    if (user && tipoComprador) fetchAlunos();
  }, [user, tipoComprador]);

  const toggleAluno = (codigo: string) => {
    setAlunosSelecionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  // Reset autorização quando muda seleção de alunos
  useEffect(() => {
    setAutorizacaoAceita(false);
  }, [alunosSelecionados]);

  const addConvidado = () => setConvidados((prev) => [...prev, emptyConvidado()]);
  const removeConvidado = (index: number) => setConvidados((prev) => prev.filter((_, i) => i !== index));
  const updateConvidado = (index: number, field: keyof Convidado, value: string) => {
    setConvidados((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  // Default automático: comprador entra como participante quando faz mais sentido
  useEffect(() => {
    if (loadingAlunos || !tipoComprador || comprarParaSiTouched) return;
    if (tipoComprador === "externo") setComprarParaSi(true);
    else setComprarParaSi(alunos.length === 0);
  }, [tipoComprador, alunos.length, loadingAlunos, comprarParaSiTouched]);

  const totalParticipantes = (comprarParaSi ? 1 : 0) + alunosSelecionados.length + convidados.length;
  const alunoCortesia = !!evento?.aluno_cortesia;
  const qtdAlunosCortesia = alunoCortesia ? alunosSelecionados.length : 0;

  const temParcelamento = evento ? evento.preco_parcelado > 0 && evento.max_parcelas > 1 : false;
  const meiaHabilitada = !!evento?.meia_entrada_habilitada && Number(evento?.preco_meia ?? 0) > 0;

  // Identificadores de cada participante (para meia config) — alunos cortesia não entram em meia
  const participantKeys: string[] = [
    ...(comprarParaSi ? ["comprador-self"] : []),
    ...(alunoCortesia ? [] : alunosSelecionados.map((c) => `aluno-${c}`)),
    ...convidados.map((_, i) => `convidado-${i}`),
  ];

  const qtdMeias = participantKeys.filter((k) => getMeia(k).tipo_ingresso === "meia").length;
  const qtdParticipantesPagantes = totalParticipantes - qtdAlunosCortesia;
  const qtdInteiras = qtdParticipantesPagantes - qtdMeias;

  const precoInteiraUnit = formaPagamento === "parcelado" && temParcelamento && evento
    ? evento.preco_parcelado
    : evento?.preco ?? 0;
  const precoMeiaUnit = formaPagamento === "parcelado" && temParcelamento && evento
    ? Number(evento.preco_meia_parcelado ?? 0)
    : Number(evento?.preco_meia ?? 0);

  const total = qtdInteiras * precoInteiraUnit + qtdMeias * precoMeiaUnit;
  const valorParcela = temParcelamento && evento && evento.max_parcelas > 0
    ? total / evento.max_parcelas
    : 0;

  // Carrega info de cota de meia
  useEffect(() => {
    const load = async () => {
      if (!id || !meiaHabilitada) return;
      const { data } = await supabase.rpc("contar_meias_evento" as any, { p_evento_id: id });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setMeiaInfo({
        vagas_meia_total: Number(row.vagas_meia_total ?? 0),
        meias_vendidas: Number(row.meias_vendidas ?? 0),
        meias_disponiveis: Number(row.meias_disponiveis ?? 0),
      });
    };
    load();
  }, [id, meiaHabilitada, redirectCountdown]);

  // Validação: toda meia deve ter categoria + declaração
  const meiasInvalidas = participantKeys.some((k) => {
    const m = getMeia(k);
    return m.tipo_ingresso === "meia" && (!m.categoria_meia || !m.declaracao);
  });
  const cotaMeiaExcedida = meiaHabilitada && meiaInfo ? qtdMeias > meiaInfo.meias_disponiveis : false;

  const precisaCompletarPerfil =
    tipoComprador === "aluno" && !loadingAlunos && alunos.length === 0 && !compradorExternoData?.cpf;

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

    // Auto-cadastro do comprador (caso não seja aluno vinculado nem externo já cadastrado)
    let compradorExternoLocal = compradorExternoData;
    if (precisaCompletarPerfil) {
      const cpfClean = compradorForm.cpf.replace(/\D/g, "");
      if (cpfClean.length !== 11) {
        toast({ title: "Informe um CPF válido (11 dígitos)", variant: "destructive" });
        return;
      }
      const celClean = compradorForm.celular.replace(/\D/g, "") || null;
      const { error: upErr } = await supabase
        .from("compradores_externos")
        .upsert(
          {
            user_id: user.id,
            nome: nomeComprador.trim(),
            cpf: cpfClean,
            email: user.email || "",
            celular: celClean,
            data_nascimento: compradorForm.data_nascimento || null,
          },
          { onConflict: "user_id" }
        );
      if (upErr) {
        toast({ title: "Não foi possível salvar seus dados", description: upErr.message, variant: "destructive" });
        return;
      }
      compradorExternoLocal = {
        cpf: cpfClean,
        email: user.email || undefined,
        celular: celClean || undefined,
        data_nascimento: compradorForm.data_nascimento || undefined,
      };
      setCompradorExternoData(compradorExternoLocal);
      setTipoComprador("externo");
    }


    // Validate convidados
    for (let i = 0; i < convidados.length; i++) {
      const c = convidados[i];
      if (!c.nome.trim()) {
        toast({ title: `Informe o nome do convidado ${i + 1}`, variant: "destructive" });
        return;
      }
    }

    // Validar meias
    if (meiasInvalidas) {
      toast({ title: "Meia-entrada incompleta", description: "Selecione a categoria e aceite a declaração para todas as meias.", variant: "destructive" });
      return;
    }
    if (cotaMeiaExcedida) {
      toast({ title: "Cota de meia-entrada excedida", description: `Restam apenas ${meiaInfo?.meias_disponiveis ?? 0} meia(s) disponível(is).`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Re-fetch vagas + aluno_cortesia para garantir dados atualizados
      const { data: eventoAtual } = await supabase
        .from("eventos")
        .select("vagas_disponiveis, aluno_cortesia")
        .eq("id", evento.id)
        .single();

      if (eventoAtual) {
        setEvento((prev) => prev ? { ...prev, vagas_disponiveis: eventoAtual.vagas_disponiveis, aluno_cortesia: (eventoAtual as any).aluno_cortesia } : prev);
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
      const nowIso = new Date().toISOString();
      const isParcelado = formaPagamento === "parcelado";
      const precoInteira = Number(isParcelado ? evento.preco_parcelado : evento.preco) || 0;
      const precoMeiaCalc = Number(isParcelado ? (evento.preco_meia_parcelado ?? 0) : (evento.preco_meia ?? 0)) || 0;
      const valorPara = (isMeia: boolean) => Number((isMeia ? precoMeiaCalc : precoInteira).toFixed(2));

      // Shape base — TODAS as linhas do INSERT precisam ter as MESMAS chaves
      // (supabase-js normaliza o conjunto de colunas pela união, e omitir
      // colunas em parte dos registros gera NULL nas demais — quebra NOT NULL).
      const baseRecord = {
        evento_id: evento.id,
        user_id: user.id,
        nome_comprador: nomeComprador.trim(),
        codigo_aluno: null as string | null,
        quantidade: 1,
        status: "pendente" as string,
        cortesia: false as boolean,
        tipo_participante: "convidado" as string,
        nome_participante: null as string | null,
        cpf_participante: null as string | null,
        data_nascimento_participante: null as string | null,
        email_participante: null as string | null,
        celular_participante: null as string | null,
        tipo_ingresso: "inteira" as string,
        categoria_meia: null as string | null,
        declaracao_meia_aceita: false as boolean,
        declaracao_meia_aceita_em: null as string | null,
        valor_total: 0 as number,
        forma_pagamento: null as string | null,
        parcelas: 1 as number,
      };

      // Comprador participando como ingresso
      if (comprarParaSi) {
        const m = getMeia("comprador-self");
        const isMeia = m.tipo_ingresso === "meia";
        const cpfSelf = compradorExternoLocal?.cpf || (user.user_metadata?.cpf as string | undefined) || null;
        records.push({
          ...baseRecord,
          tipo_participante: "convidado",
          nome_participante: nomeComprador.trim(),
          cpf_participante: cpfSelf,
          data_nascimento_participante: compradorExternoLocal?.data_nascimento || null,
          email_participante: compradorExternoLocal?.email || user.email || null,
          celular_participante: compradorExternoLocal?.celular || null,
          tipo_ingresso: isMeia ? "meia" : "inteira",
          categoria_meia: isMeia ? m.categoria_meia : null,
          declaracao_meia_aceita: isMeia ? m.declaracao : false,
          declaracao_meia_aceita_em: isMeia && m.declaracao ? nowIso : null,
          valor_total: valorPara(isMeia),
        });
      }

      // Alunos
      const alunoCortesia = (eventoAtual as any)?.aluno_cortesia !== undefined
        ? !!(eventoAtual as any).aluno_cortesia
        : !!evento.aluno_cortesia;
      for (const codigo of alunosSelecionados) {
        const aluno = alunos.find((a) => a.codigo_aluno === codigo);
        const m = getMeia(`aluno-${codigo}`);
        const isMeia = !alunoCortesia && m.tipo_ingresso === "meia";
        records.push({
          ...baseRecord,
          codigo_aluno: codigo,
          status: alunoCortesia ? "pago" : "pendente",
          cortesia: alunoCortesia,
          tipo_participante: "aluno",
          nome_participante: aluno?.nome_aluno || null,
          tipo_ingresso: isMeia ? "meia" : "inteira",
          categoria_meia: isMeia ? m.categoria_meia : null,
          declaracao_meia_aceita: isMeia ? m.declaracao : false,
          declaracao_meia_aceita_em: isMeia && m.declaracao ? nowIso : null,
          valor_total: alunoCortesia ? 0 : valorPara(isMeia),
        });
      }

      // Convidados
      for (let i = 0; i < convidados.length; i++) {
        const c = convidados[i];
        const m = getMeia(`convidado-${i}`);
        const isMeia = m.tipo_ingresso === "meia";
        records.push({
          ...baseRecord,
          tipo_participante: "convidado",
          nome_participante: c.nome.trim(),
          cpf_participante: c.cpf || null,
          data_nascimento_participante: c.data_nascimento || null,
          email_participante: c.email || null,
          celular_participante: c.celular || null,
          tipo_ingresso: isMeia ? "meia" : "inteira",
          categoria_meia: isMeia ? m.categoria_meia : null,
          declaracao_meia_aceita: isMeia ? m.declaracao : false,
          declaracao_meia_aceita_em: isMeia && m.declaracao ? nowIso : null,
          valor_total: valorPara(isMeia),
        });
      }

      const { data: insertedData, error } = await supabase.from("ingressos").insert(records).select("id, cortesia");
      if (error) throw error;

      const payableIds = (insertedData || [])
        .filter((r: any) => r.cortesia !== true)
        .map((r: any) => r.id) as string[];

      // Se não há nada a cobrar (todos cortesia), pular checkout
      if (payableIds.length === 0) {
        toast({
          title: "Ingresso(s) de cortesia emitido(s)!",
          description: "Sem cobrança. Acesse 'Meus Ingressos' para visualizar.",
        });
        setTotalIngressosReservados(records.length);
        setRedirectCountdown(5);
        return;
      }

      // Asaas: cria/recupera cobrança apenas para os ingressos pagos
      const formaAsaas = formaPagamento === "parcelado" ? "credit_card" : "pix";
      const parcelas = formaPagamento === "parcelado" ? evento.max_parcelas : 1;
      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke(
        "asaas-create-checkout",
        { body: { ingresso_ids: payableIds, forma_pagamento: formaAsaas, parcelas } }
      );

      if (checkoutErr || (checkoutData as any)?.error) {
        const msg = (checkoutData as any)?.error || checkoutErr?.message || "Falha ao gerar cobrança";
        toast({
          title: "Ingressos reservados, mas o checkout falhou",
          description: `${msg}. Acesse "Meus Ingressos" para tentar novamente.`,
          variant: "destructive",
        });
        setTotalIngressosReservados(records.length);
        setRedirectCountdown(10);
        return;
      }

      // Abre o checkout do Asaas em nova aba imediatamente (UX: pagamento + redirect paralelo)
      const checkoutUrl = (checkoutData as any)?.checkout_url;
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        toast({
          title: "Checkout aberto em nova aba",
          description: "Conclua o pagamento na nova aba. Você será redirecionado em alguns segundos.",
        });
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green"></div>
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
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

  // Novo modelo usa publico_alvo; eventos antigos sem publico_alvo caem no tipo_evento.
  const permiteConvidados = (evento as any).publico_alvo
    ? (evento as any).publico_alvo !== "apenas_alunos"
    : evento.tipo_evento === "alunos_convidados";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Compra de ingressos" />
      <div className="flex-1 py-8 px-4">
      {/* Countdown overlay */}
      {redirectCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5">
            <div className="mx-auto w-16 h-16 bg-zampieri-cream rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-zampieri-gold" />
            </div>
            <h3 className="text-xl font-bold text-zampieri-green-dark">Ingressos reservados!</h3>
            <p className="text-sm text-muted-foreground">
              {totalIngressosReservados} ingresso(s) reservado(s) com sucesso.<br />
              Aguarde o link de pagamento.
            </p>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-zampieri-green-dark">{redirectCountdown}</div>
              <Progress value={((10 - redirectCountdown) / 10) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Redirecionando para Meus Ingressos em {redirectCountdown} segundo{redirectCountdown !== 1 ? "s" : ""}...
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto max-w-lg">
        <Link to="/eventos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para eventos
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-zampieri-green-dark">{evento.titulo}</CardTitle>
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
              <label className="text-sm font-medium">Nome do comprador *</label>
              <Input value={nomeComprador} onChange={(e) => setNomeComprador(e.target.value)} placeholder="Seu nome completo" />
            </div>

            {/* Auto-cadastro do comprador (sem aluno vinculado nem cadastro externo) */}
            {precisaCompletarPerfil && (
              <div className="rounded-md border border-zampieri-green/30 bg-zampieri-cream/30 p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-zampieri-green-dark">Complete seus dados de comprador</p>
                  <p className="text-xs text-muted-foreground">
                    Não localizamos aluno vinculado ao seu cadastro. Precisamos do seu CPF para emitir a cobrança.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="CPF *"
                    value={compradorForm.cpf}
                    onChange={(e) => setCompradorForm((p) => ({ ...p, cpf: e.target.value }))}
                  />
                  <Input
                    placeholder="Celular"
                    value={compradorForm.celular}
                    onChange={(e) => setCompradorForm((p) => ({ ...p, celular: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Data de nascimento"
                    value={compradorForm.data_nascimento}
                    onChange={(e) => setCompradorForm((p) => ({ ...p, data_nascimento: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <label className="text-sm font-medium block">Quem vai participar do evento?</label>

              {/* Card: Você (comprador) */}
              {permiteConvidados && (
                <div
                  className={`flex items-start space-x-3 p-3 rounded-md border-2 cursor-pointer transition ${comprarParaSi ? "border-zampieri-green bg-zampieri-cream/40" : "border-border hover:bg-muted/40"}`}
                  onClick={() => { setComprarParaSiTouched(true); setComprarParaSi((v) => !v); }}
                >
                  <Checkbox
                    checked={comprarParaSi}
                    onCheckedChange={(c) => { setComprarParaSiTouched(true); setComprarParaSi(c === true); }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zampieri-green-dark">
                      Eu também vou participar
                      {nomeComprador.trim() && <span className="text-muted-foreground font-normal"> — {nomeComprador.trim()}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Marque se o ingresso é para você. Já preenchido com seus dados de cadastro.
                    </p>
                  </div>
                </div>
              )}

              {/* Alunos vinculados */}
              {tipoComprador !== "externo" && (
                <div>
                  {loadingAlunos ? (
                    <p className="text-sm text-muted-foreground">Carregando alunos vinculados...</p>
                  ) : alunos.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Não localizamos alunos vinculados ao seu CPF. Marque a opção acima para comprar para você ou adicione convidados abaixo.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Alunos vinculados ao seu CPF
                        {alunoCortesia && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zampieri-gold/20 text-zampieri-green-dark border border-zampieri-gold/40">
                            CORTESIA — não paga
                          </span>
                        )}
                      </p>
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
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{aluno.nome_aluno}</p>
                                  {alunoCortesia && alunosSelecionados.includes(aluno.codigo_aluno) && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zampieri-gold/20 text-zampieri-green-dark border border-zampieri-gold/40 whitespace-nowrap">
                                      Cortesia · R$ 0,00
                                    </span>
                                  )}
                                </div>
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
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Convidados */}
            {permiteConvidados && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium block">Outros convidados</label>
                    <p className="text-xs text-muted-foreground">Cônjuge, avô, primo, amigo etc.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addConvidado}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Adicionar convidado
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

            {/* Meia-entrada por participante (Lei 12.933/2013) */}
            {meiaHabilitada && totalParticipantes > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium block">Tipo de ingresso por participante</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conforme Lei 12.933/2013, há cota de meia-entrada (estudantes, idosos 60+, PCD + acompanhante e professores da rede pública). É exigida comprovação na portaria.
                  </p>
                  {meiaInfo && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">Meias disponíveis no evento: </span>
                      <span className={meiaInfo.meias_disponiveis <= 0 ? "text-destructive font-bold" : "text-zampieri-green-dark font-bold"}>
                        {meiaInfo.meias_disponiveis} de {meiaInfo.vagas_meia_total}
                      </span>
                    </p>
                  )}
                </div>

                {participantKeys.map((key) => {
                  const isAluno = key.startsWith("aluno-");
                  const isSelf = key === "comprador-self";
                  const label = isSelf
                    ? `${nomeComprador.trim() || "Você"} (comprador)`
                    : isAluno
                      ? alunos.find((a) => `aluno-${a.codigo_aluno}` === key)?.nome_aluno ?? "Aluno"
                      : convidados[Number(key.replace("convidado-", ""))]?.nome?.trim() || `Convidado ${Number(key.replace("convidado-", "")) + 1}`;
                  const m = getMeia(key);
                  const categoriasPermitidas = evento.categorias_meia ?? [];
                  return (
                    <div key={key} className="border rounded-md p-3 space-y-2 bg-muted/20">
                      <p className="text-xs font-semibold text-zampieri-green-dark">{label}</p>
                      <RadioGroup
                        value={m.tipo_ingresso}
                        onValueChange={(v) => setMeiaField(key, { tipo_ingresso: v as "inteira" | "meia", categoria_meia: v === "inteira" ? "" : m.categoria_meia, declaracao: v === "inteira" ? false : m.declaracao })}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="inteira" id={`${key}-inteira`} />
                          <Label htmlFor={`${key}-inteira`} className="cursor-pointer text-sm">Inteira</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="meia" id={`${key}-meia`} />
                          <Label htmlFor={`${key}-meia`} className="cursor-pointer text-sm">Meia (50%)</Label>
                        </div>
                      </RadioGroup>

                      {m.tipo_ingresso === "meia" && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <Label className="text-xs">Categoria *</Label>
                            <select
                              className="w-full border rounded-md p-2 text-sm bg-background"
                              value={m.categoria_meia}
                              onChange={(e) => setMeiaField(key, { categoria_meia: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              {categoriasPermitidas.map((c) => (
                                <option key={c} value={c}>{CATEGORIAS_LABELS[c] ?? c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id={`${key}-decl`}
                              checked={m.declaracao}
                              onCheckedChange={(c) => setMeiaField(key, { declaracao: c === true })}
                            />
                            <label htmlFor={`${key}-decl`} className="text-xs cursor-pointer">
                              Declaro, sob as penas da lei, que o participante se enquadra na categoria selecionada e apresentarei o documento comprobatório original na portaria do evento. Caso contrário, será necessário pagar a diferença para ingresso inteira.
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {cotaMeiaExcedida && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Cota de meia-entrada excedida. Restam {meiaInfo?.meias_disponiveis ?? 0} meia(s).
                  </p>
                )}
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
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="avista" id="avista" className="mt-1" />
                    <Label htmlFor="avista" className="cursor-pointer">
                      <span className="font-medium">
                        À vista — R$ {(qtdInteiras * evento.preco + qtdMeias * Number(evento.preco_meia ?? 0)).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="block text-xs text-muted-foreground">PIX ou cartão de crédito (1x)</span>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="parcelado" id="parcelado" className="mt-1" />
                    <Label htmlFor="parcelado" className="cursor-pointer">
                      <span className="font-medium">
                        {evento.max_parcelas}x de R$ {valorParcela.toFixed(2).replace(".", ",")} (Total: R${" "}
                        {(qtdInteiras * evento.preco_parcelado + qtdMeias * Number(evento.preco_meia_parcelado ?? 0)).toFixed(2).replace(".", ",")})
                      </span>
                      <span className="block text-xs text-muted-foreground">Cartão de crédito parcelado</span>
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

            {/* Termos de compra — checkbox + link para popup */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="termos"
                  checked={termosAceitos}
                  onCheckedChange={(checked) => setTermosAceitos(checked === true)}
                />
                <label htmlFor="termos" className="text-xs cursor-pointer">
                  Li e aceito os{" "}
                  <button
                    type="button"
                    className="text-zampieri-green-dark underline font-medium hover:text-zampieri-gold"
                    onClick={(e) => { e.preventDefault(); setTermosDialogOpen(true); }}
                  >
                    Termos de Compra e Participação
                  </button>.
                </label>
              </div>
            </div>

            {/* Autorização (somente se evento requer) */}
            {evento.requer_autorizacao && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="autorizacao"
                    checked={autorizacaoAceita}
                    onCheckedChange={(checked) => setAutorizacaoAceita(checked === true)}
                    disabled={alunosSelecionados.length === 0}
                  />
                  <label
                    htmlFor="autorizacao"
                    className={`text-xs cursor-pointer ${alunosSelecionados.length === 0 ? "text-muted-foreground" : ""}`}
                  >
                    Autorizo a participação conforme{" "}
                    <button
                      type="button"
                      className="text-zampieri-green-dark underline font-medium hover:text-zampieri-gold"
                      onClick={(e) => { e.preventDefault(); setAutorizacaoDialogOpen(true); }}
                      disabled={alunosSelecionados.length === 0}
                    >
                      texto da autorização
                    </button>.
                  </label>
                </div>
                {alunosSelecionados.length === 0 && (
                  <p className="text-xs text-muted-foreground ml-7">Selecione ao menos um aluno para habilitar.</p>
                )}
              </div>
            )}

            {/* Dialog dos Termos */}
            <Dialog open={termosDialogOpen} onOpenChange={setTermosDialogOpen}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base">Termos de Compra e Participação</DialogTitle>
                </DialogHeader>
                <div className="text-xs text-gray-700 space-y-3">
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
              </DialogContent>
            </Dialog>

            {/* Dialog da Autorização */}
            <Dialog open={autorizacaoDialogOpen} onOpenChange={setAutorizacaoDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base">Autorização de Participação</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-gray-700 space-y-4">
                  {alunosSelecionados.length === 0 ? (
                    <p className="text-muted-foreground italic">Selecione ao menos um aluno para visualizar o texto da autorização.</p>
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
              </DialogContent>
            </Dialog>

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
                <span className={`font-medium ${evento.vagas_disponiveis < 5 ? "text-destructive" : "text-zampieri-green-dark"}`}>
                  {evento.vagas_disponiveis}
                </span>
              </div>
              {totalParticipantes > evento.vagas_disponiveis && (
                <p className="text-sm text-destructive font-medium mb-2">
                  ⚠️ Não há vagas suficientes para {totalParticipantes} participante(s).
                </p>
              )}
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-zampieri-green-dark">
                  {total === 0 && totalParticipantes > 0 ? "Gratuito" : total === 0 ? "—" : `R$ ${total.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
              <Button
                onClick={handleComprar}
                className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white"
                disabled={
                  submitting ||
                  totalParticipantes === 0 ||
                  totalParticipantes > evento.vagas_disponiveis ||
                  !termosAceitos ||
                  (evento.requer_autorizacao && !autorizacaoAceita) ||
                  meiasInvalidas ||
                  cotaMeiaExcedida
                }
              >
                {submitting ? "Processando..." : "Reservar Ingressos"}
              </Button>
              {(!termosAceitos || (evento.requer_autorizacao && !autorizacaoAceita) || meiasInvalidas || cotaMeiaExcedida) && totalParticipantes > 0 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  {!termosAceitos
                    ? "Aceite os termos de compra para continuar."
                    : evento.requer_autorizacao && !autorizacaoAceita
                    ? "Aceite a autorização de participação para continuar."
                    : meiasInvalidas
                    ? "Selecione a categoria e aceite a declaração de cada meia-entrada."
                    : "Cota de meia-entrada excedida."}
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
      <Footer />
    </div>
  );
};

export default EventoCompra;
