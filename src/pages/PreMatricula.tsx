import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { brToIso, isValidCpf, isValidEmail, onlyDigits } from "@/components/rematricula/utils";
import {
  EtapaAluno,
  EtapaConsentimento,
  EtapaDesenvolvimento,
  EtapaHistorico,
  EtapaResponsavel,
  EtapaSaude,
} from "@/components/prematricula/Etapas";
import { ETAPAS, PreMatriculaForm, formVazio } from "@/components/prematricula/types";

type Erros = Partial<Record<keyof PreMatriculaForm | "boletim", string>>;

const obrigatoriosPorEtapa: Record<number, (keyof PreMatriculaForm)[]> = {
  0: ["resp_tipo", "resp_nome", "resp_email", "resp_cpf", "resp_whatsapp"],
  1: ["aluno_nome", "aluno_nascimento", "serie_pretendida", "turno_preferencia", "tipo_escola"],
  2: ["repetiu_ano", "dificuldade_aprendizagem", "atendimento_complementar"],
  3: ["dificuldade_atencao", "diagnostico", "dificuldade_socializacao"],
  4: ["usa_medicacao"],
  5: [],
};

const PreMatricula = () => {
  const { toast } = useToast();
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState<PreMatriculaForm>(formVazio());
  const [erros, setErros] = useState<Erros>({});
  const [boletim, setBoletim] = useState<File | null>(null);
  const [laudo, setLaudo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [telefoneVerificado, setTelefoneVerificado] = useState<string | null>(null);
  const [emailVerificado, setEmailVerificado] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ protocolo: string | null } | null>(null);
  const [checando, setChecando] = useState(false);

  useEffect(() => {
    document.title = "Pré-matrícula — Colégio Zampieri";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Formulário de pré-matrícula do Colégio Zampieri: envie os dados do aluno e agende a entrevista familiar.",
    );
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [etapa, protocolo]);

  const set = <K extends keyof PreMatriculaForm>(campo: K, valor: PreMatriculaForm[K]) => {
    setErros((p) => ({ ...p, [campo]: undefined }));
    setForm((p) => ({ ...p, [campo]: valor }));
  };

  const progresso = useMemo(() => ((etapa + 1) / ETAPAS.length) * 100, [etapa]);

  const validarEtapa = () => {
    const e: Erros = {};
    obrigatoriosPorEtapa[etapa].forEach((c) => {
      if (!String(form[c] ?? "").trim()) e[c] = "Campo obrigatório";
    });
    if (etapa === 0) {
      if (!e.resp_email && !isValidEmail(form.resp_email)) e.resp_email = "E-mail inválido";
      if (!e.resp_email && emailVerificado !== form.resp_email.trim().toLowerCase())
        e.resp_email = "Confirme o código enviado no e-mail";
      if (!e.resp_cpf && !isValidCpf(form.resp_cpf)) e.resp_cpf = "CPF inválido";
      if (!e.resp_whatsapp && onlyDigits(form.resp_whatsapp).length < 10)
        e.resp_whatsapp = "Telefone incompleto";
      if (!e.resp_whatsapp && telefoneVerificado !== onlyDigits(form.resp_whatsapp))
        e.resp_whatsapp = "Confirme o código enviado no WhatsApp";
    }
    if (etapa === 1 && !e.aluno_nascimento && !brToIso(form.aluno_nascimento))
      e.aluno_nascimento = "Data inválida";
    if (etapa === 2) {
      if (!boletim) e.boletim = "Anexe o último boletim escolar";
    }
    if (etapa === 3) {
      const pede = form.diagnostico.startsWith("Sim");
      if (pede && !form.diagnostico_detalhe.trim())
        e.diagnostico_detalhe = "Descreva o diagnóstico ou hipótese";
    }
    if (etapa === 4 && form.usa_medicacao === "Sim" && !form.medicacao_detalhe.trim())
      e.medicacao_detalhe = "Informe a medicação";
    if (etapa === 5) {
      if (!form.consentimento_veracidade) e.consentimento_veracidade = "obrigatório";
      if (!form.consentimento_privacidade) e.consentimento_privacidade = "obrigatório";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const checarAluno = async () => {
    const nasc = brToIso(form.aluno_nascimento);
    if (!nasc) return true;
    setChecando(true);
    try {
      const { data } = await supabase.functions.invoke("prematricula-otp", {
        body: { acao: "checar_aluno", aluno_nome: form.aluno_nome, aluno_nascimento: nasc },
      });
      if (data?.existe) {
        setDuplicado({ protocolo: data.protocolo ?? null });
        return false;
      }
      return true;
    } catch {
      return true;
    } finally {
      setChecando(false);
    }
  };

  const avancar = async () => {
    if (!validarEtapa()) return;
    if (etapa === 1 && !(await checarAluno())) return;
    if (etapa < ETAPAS.length - 1) setEtapa(etapa + 1);
    else enviar();
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append(
        "dados",
        JSON.stringify({
          ...form,
          resp_cpf: onlyDigits(form.resp_cpf),
          resp_whatsapp: onlyDigits(form.resp_whatsapp),
          aluno_nascimento: brToIso(form.aluno_nascimento),
        }),
      );
      if (boletim) fd.append("boletim", boletim);
      if (laudo) fd.append("laudo", laudo);

      const { data, error } = await supabase.functions.invoke("prematricula-enviar", { body: fd });
      if (data?.error === "aluno_duplicado") {
        setDuplicado({ protocolo: data.protocolo ?? null });
        return;
      }
      if (data?.error === "otp_nao_verificado" || data?.error === "otp_email_nao_verificado") {
        const ehEmail = data.error === "otp_email_nao_verificado";
        if (ehEmail) setEmailVerificado(null);
        else setTelefoneVerificado(null);
        setEtapa(0);
        toast({
          title: ehEmail ? "Confirme seu e-mail" : "Confirme seu WhatsApp",
          description: `Precisamos validar o código enviado para o seu ${
            ehEmail ? "e-mail" : "número"
          } antes de enviar.`,
          variant: "destructive",
        });
        return;
      }
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "falha");
      setProtocolo(data.protocolo as string);
    } catch (err) {
      console.error(err);
      toast({
        title: "Não foi possível enviar",
        description: "Confira os dados e os arquivos anexados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const props = {
    form,
    erros,
    set,
    boletim,
    laudo,
    setBoletim,
    setLaudo,
    telefoneVerificado,
    setTelefoneVerificado,
    emailVerificado,
    setEmailVerificado,
  };

  if (duplicado) {
    return (
      <main className="min-h-screen bg-zampieri-cream/30 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl bg-white border border-border p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-zampieri-green-dark" />
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
            Já existe uma pré-matrícula
          </h1>
          <p className="text-sm text-muted-foreground">
            Encontramos uma pré-matrícula já registrada para <strong>{form.aluno_nome}</strong>. Para
            evitar cadastros duplicados, não é possível enviar o formulário novamente.
          </p>
          {duplicado.protocolo && (
            <p className="text-sm">
              Protocolo: <strong>{duplicado.protocolo}</strong>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Precisa corrigir alguma informação? Fale com a secretaria pelo WhatsApp{" "}
            <strong>(11) 93934-1503</strong>.
          </p>
          <Button asChild variant="outline" className="w-full">
            <a href="/">Voltar ao site</a>
          </Button>
        </div>
      </main>
    );
  }

  if (protocolo) {
    return (
      <main className="min-h-screen bg-zampieri-cream/30 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl bg-white border border-border p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-zampieri-green-dark" />
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
            Pré-matrícula enviada!
          </h1>
          <p className="text-sm text-muted-foreground">
            Recebemos os dados de <strong>{form.aluno_nome}</strong>. Nossa equipe vai analisar as
            informações e retornar pelo <strong>WhatsApp e e-mail em até 24 horas úteis</strong>.
          </p>
          <p className="text-sm">
            Protocolo: <strong>{protocolo}</strong>
          </p>

          <Button asChild variant="outline" className="w-full">
            <a href="/">Voltar ao site</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zampieri-cream/30 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-zampieri-green-dark">
            Ficha de Pré-matrícula
          </h1>
          <p className="text-sm text-muted-foreground">
            Este formulário coleta informações sobre o aluno(a) para iniciarmos o processo de
            matrícula com um atendimento humanizado e personalizado.
          </p>
        </header>

        <div className="rounded-2xl bg-white border border-border p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Etapa {etapa + 1} de {ETAPAS.length}
              </span>
              <span>{ETAPAS[etapa]}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-zampieri-green-dark transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          {etapa === 0 && <EtapaResponsavel {...props} />}
          {etapa === 1 && <EtapaAluno {...props} />}
          {etapa === 2 && <EtapaHistorico {...props} />}
          {etapa === 3 && <EtapaDesenvolvimento {...props} />}
          {etapa === 4 && <EtapaSaude {...props} />}
          {etapa === 5 && <EtapaConsentimento {...props} />}

          <div className="flex gap-2 pt-2">
            {etapa > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setEtapa(etapa - 1)}>
                Voltar
              </Button>
            )}
            <Button
              className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
              onClick={avancar}
              disabled={enviando || checando}
            >
              {(enviando || checando) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {etapa === ETAPAS.length - 1 ? "Enviar pré-matrícula" : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PreMatricula;
