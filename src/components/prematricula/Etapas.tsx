import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  isValidEmail,
  maskCpf,
  maskDataBr,
  maskTelefone,
  onlyDigits,
} from "@/components/rematricula/utils";
import { Campo, RadioGrupo, SecaoTitulo } from "./Campos";
import { PreMatriculaForm, SERIES } from "./types";

type Erros = Partial<Record<keyof PreMatriculaForm | "boletim", string>>;

interface Props {
  form: PreMatriculaForm;
  erros: Erros;
  set: <K extends keyof PreMatriculaForm>(campo: K, valor: PreMatriculaForm[K]) => void;
  boletim: File | null;
  laudo: File | null;
  setBoletim: (f: File | null) => void;
  setLaudo: (f: File | null) => void;
  telefoneVerificado?: string | null;
  setTelefoneVerificado?: (t: string | null) => void;
  emailVerificado?: string | null;
  setEmailVerificado?: (e: string | null) => void;
}

const ACEITOS = ".pdf,.jpg,.jpeg,.png";

const ERROS_OTP: Record<string, string> = {
  telefone_invalido: "Número de WhatsApp inválido.",
  email_invalido: "E-mail inválido.",
  muitas_tentativas: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  envio_falhou: "Não conseguimos enviar o código para este contato.",
  codigo_expirado: "O código expirou. Peça um novo.",
  codigo_invalido: "Código incorreto.",
  codigo_nao_encontrado: "Nenhum código ativo. Envie um novo código.",
};

const VerificacaoContato = ({
  canal,
  destino,
  verificado,
  onVerificado,
}: {
  canal: "whatsapp" | "email";
  destino: string;
  verificado: boolean;
  onVerificado: (destino: string) => void;
}) => {
  const { toast } = useToast();
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const isEmail = canal === "email";
  const valor = isEmail ? destino.trim().toLowerCase() : onlyDigits(destino);
  const podeEnviar = isEmail ? isValidEmail(valor) : valor.length >= 10;
  const rotulo = isEmail ? "e-mail" : "WhatsApp";

  const falhar = (code?: string) =>
    toast({
      title: ERROS_OTP[code || ""] || "Não foi possível continuar",
      variant: "destructive",
    });

  const corpo = (extra: Record<string, unknown>) =>
    isEmail ? { canal: "email", email: valor, ...extra } : { telefone: valor, ...extra };

  const enviarCodigo = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("prematricula-otp", {
        body: corpo({ acao: "enviar" }),
      });
      if (error || !data?.ok) return falhar(data?.error);
      setEnviado(true);
      setEspera(60);
      toast({ title: `Código enviado por ${rotulo}` });
    } finally {
      setCarregando(false);
    }
  };

  const validarCodigo = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("prematricula-otp", {
        body: corpo({ acao: "validar", codigo: onlyDigits(codigo) }),
      });
      if (error || !data?.ok) return falhar(data?.error);
      onVerificado(valor);
      toast({ title: isEmail ? "E-mail confirmado!" : "WhatsApp confirmado!" });
    } finally {
      setCarregando(false);
    }
  };

  if (verificado) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-zampieri-cream/60 border border-border p-3 text-sm text-zampieri-green-dark">
        <CheckCircle2 className="w-4 h-4" />
        {isEmail ? "E-mail confirmado." : "Número de WhatsApp confirmado."}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        Precisamos confirmar seu {rotulo}. Enviaremos um código de 6 dígitos para o{" "}
        {isEmail ? "e-mail" : "número"} acima.
      </p>
      {!enviado ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!podeEnviar || carregando}
          onClick={enviarCodigo}
        >
          {carregando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar código
        </Button>
      ) : (
        <div className="space-y-3">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="text-center tracking-[0.4em] text-lg"
            value={codigo}
            onChange={(e) => setCodigo(onlyDigits(e.target.value).slice(0, 6))}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={espera > 0 || carregando}
              onClick={enviarCodigo}
            >
              {espera > 0 ? `Reenviar (${espera}s)` : "Reenviar código"}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
              disabled={codigo.length !== 6 || carregando}
              onClick={validarCodigo}
            >
              {carregando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const EtapaResponsavel = ({
  form,
  erros,
  set,
  telefoneVerificado,
  setTelefoneVerificado,
  emailVerificado,
  setEmailVerificado,
}: Props) => (
  <div className="space-y-5">
    <SecaoTitulo>Informações do Responsável</SecaoTitulo>
    <Campo label="O responsável é" erro={erros.resp_tipo}>
      <Select value={form.resp_tipo} onValueChange={(v) => set("resp_tipo", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mae">Mãe</SelectItem>
          <SelectItem value="pai">Pai</SelectItem>
          
        </SelectContent>
      </Select>
    </Campo>
    <Campo label="Nome completo do responsável" erro={erros.resp_nome}>
      <Input
        placeholder="Digite o nome completo"
        value={form.resp_nome}
        onChange={(e) => set("resp_nome", e.target.value)}
      />
    </Campo>
    <Campo label="E-mail" erro={erros.resp_email}>
      <Input
        type="email"
        inputMode="email"
        placeholder="Digite seu e-mail"
        value={form.resp_email}
        onChange={(e) => set("resp_email", e.target.value)}
      />
    </Campo>
    <VerificacaoContato
      canal="email"
      destino={form.resp_email}
      verificado={
        !!emailVerificado && emailVerificado === form.resp_email.trim().toLowerCase()
      }
      onVerificado={(email) => setEmailVerificado?.(email)}
    />
    <Campo label="CPF" erro={erros.resp_cpf}>
      <Input
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={form.resp_cpf}
        onChange={(e) => set("resp_cpf", maskCpf(e.target.value))}
      />
    </Campo>
    <Campo label="Número de WhatsApp" erro={erros.resp_whatsapp}>
      <Input
        inputMode="numeric"
        placeholder="(11) 99999-9999"
        value={form.resp_whatsapp}
        onChange={(e) => set("resp_whatsapp", maskTelefone(e.target.value))}
      />
    </Campo>
    <VerificacaoContato
      canal="whatsapp"
      destino={form.resp_whatsapp}
      verificado={
        !!telefoneVerificado && telefoneVerificado === onlyDigits(form.resp_whatsapp)
      }
      onVerificado={(tel) => setTelefoneVerificado?.(tel)}
    />
  </div>
);


export const EtapaAluno = ({ form, erros, set }: Props) => {
  const nascIso = brToIso(form.aluno_nascimento) || "";
  const idade = idadeEm31Marco(nascIso);
  const permitidas = seriesPermitidas(nascIso);
  const serieMax = permitidas[permitidas.length - 1];

  useEffect(() => {
    if (!nascIso) return;
    if (form.serie_pretendida && !permitidas.includes(form.serie_pretendida)) {
      set("serie_pretendida", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nascIso]);

  return (
  <div className="space-y-5">
    <SecaoTitulo>Informações do Aluno</SecaoTitulo>
    <Campo label="Nome completo do aluno" erro={erros.aluno_nome}>
      <Input
        placeholder="Digite o nome completo"
        value={form.aluno_nome}
        onChange={(e) => set("aluno_nome", e.target.value)}
      />
    </Campo>
    <Campo label="Data de nascimento" erro={erros.aluno_nascimento}>
      <Input
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={form.aluno_nascimento}
        onChange={(e) => set("aluno_nascimento", maskDataBr(e.target.value))}
      />
    </Campo>
    <Campo label="Série pretendida" erro={erros.serie_pretendida}>
      <Select
        value={form.serie_pretendida}
        onValueChange={(v) => set("serie_pretendida", v)}
        disabled={!nascIso}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={nascIso ? "Selecione a série" : "Informe a data de nascimento"}
          />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {SERIES.map((s) => (
            <SelectItem key={s} value={s} disabled={!permitidas.includes(s)}>
              {s}
              {!permitidas.includes(s) && nascIso ? " — idade insuficiente" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {nascIso && idade !== null && (
        <p className="text-xs text-muted-foreground mt-1">
          {idade >= 18
            ? "Alunos com 18 anos ou mais em 31/03/2027 não podem ser matriculados. Fale com a secretaria."
            : permitidas.length === 0
              ? `Idade em 31/03/2027: ${idade} ano(s). Não há série disponível para essa idade.`
              : `Idade em 31/03/2027: ${idade} ano(s). Série máxima permitida: ${serieMax}.`}
        </p>
      )}
    </Campo>
    <RadioGrupo
      label="Turno de preferência"
      nome="turno"
      opcoes={["Manhã", "Tarde"]}
      valor={form.turno_preferencia}
      onChange={(v) => set("turno_preferencia", v)}
      erro={erros.turno_preferencia}
    />
    <RadioGrupo
      label="Tipo de escola"
      nome="tipo_escola"
      opcoes={["Pública", "Privada", "Nunca estudou"]}
      valor={form.tipo_escola}
      onChange={(v) => {
        set("tipo_escola", v);
        if (v === "Nunca estudou") set("escola_atual", "");
      }}
      erro={erros.tipo_escola}
    />
    {form.tipo_escola !== "Nunca estudou" && (
      <Campo label="Nome da escola atual" erro={erros.escola_atual}>
        <Input
          placeholder="Digite o nome da escola atual"
          value={form.escola_atual}
          onChange={(e) => set("escola_atual", e.target.value)}
        />
      </Campo>
    )}

  </div>
  );
};


export const EtapaHistorico = ({ form, erros, set, boletim, setBoletim }: Props) => (
  <div className="space-y-5">
    <SecaoTitulo>Histórico Acadêmico e Aprendizagem</SecaoTitulo>
    <RadioGrupo
      label="O aluno(a) já repetiu algum ano escolar?"
      nome="repetiu"
      opcoes={["Sim", "Não"]}
      valor={form.repetiu_ano}
      onChange={(v) => set("repetiu_ano", v)}
      erro={erros.repetiu_ano}
    />
    <Campo
      label="Último boletim escolar"
      erro={erros.boletim}
      dica="Formatos aceitos: PDF, JPG, JPEG, PNG. Tamanho máximo: 10MB."
    >
      <Input
        type="file"
        accept={ACEITOS}
        onChange={(e) => setBoletim(e.target.files?.[0] ?? null)}
      />
      {boletim && <p className="text-xs text-muted-foreground mt-1">{boletim.name}</p>}
    </Campo>
    <RadioGrupo
      label="Percebe alguma dificuldade em leitura, escrita ou matemática?"
      nome="dif_aprend"
      opcoes={["Sim", "Não"]}
      valor={form.dificuldade_aprendizagem}
      onChange={(v) => set("dificuldade_aprendizagem", v)}
      erro={erros.dificuldade_aprendizagem}
    />
    <RadioGrupo
      label="O aluno já recebeu algum tipo de atendimento educacional complementar?"
      nome="atendimento"
      opcoes={["Reforço escolar", "Psicopedagógico", "Fonoaudiólogo / Psicólogo", "Nenhum"]}
      valor={form.atendimento_complementar}
      onChange={(v) => set("atendimento_complementar", v)}
      erro={erros.atendimento_complementar}
    />
  </div>
);

export const EtapaDesenvolvimento = ({ form, erros, set, laudo, setLaudo }: Props) => {
  const pedeLaudo =
    form.diagnostico === "Sim (diagnosticado)" || form.diagnostico === "Sim (em avaliação)";
  return (
    <div className="space-y-5">
      <SecaoTitulo>Desenvolvimento e Comportamento</SecaoTitulo>
      <RadioGrupo
        label="Apresenta dificuldade de atenção?"
        nome="atencao"
        opcoes={["Sim", "Não", "Às vezes"]}
        valor={form.dificuldade_atencao}
        onChange={(v) => set("dificuldade_atencao", v)}
        erro={erros.dificuldade_atencao}
      />
      <RadioGrupo
        label="Há diagnóstico ou suspeita de transtornos (TDAH, TEA, Dislexia, etc.)?"
        nome="diagnostico"
        opcoes={["Sim (diagnosticado)", "Sim (em avaliação)", "Não"]}
        valor={form.diagnostico}
        onChange={(v) => set("diagnostico", v)}
        erro={erros.diagnostico}
      />
      {pedeLaudo && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
          <Campo label="Qual o diagnóstico ou hipótese?" erro={erros.diagnostico_detalhe}>
            <Textarea
              placeholder="Descreva brevemente"
              value={form.diagnostico_detalhe}
              onChange={(e) => set("diagnostico_detalhe", e.target.value)}
            />
          </Campo>
          <Campo
            label="Upload do laudo ou relatório"
            dica="Formatos aceitos: PDF, JPG, JPEG, PNG. Tamanho máximo: 10MB."
          >
            <Input
              type="file"
              accept={ACEITOS}
              onChange={(e) => setLaudo(e.target.files?.[0] ?? null)}
            />
            {laudo && <p className="text-xs text-muted-foreground mt-1">{laudo.name}</p>}
          </Campo>
        </div>
      )}
      <RadioGrupo
        label="Dificuldade de socialização?"
        nome="socializacao"
        opcoes={["Sim", "Não", "Em algumas situações"]}
        valor={form.dificuldade_socializacao}
        onChange={(v) => set("dificuldade_socializacao", v)}
        erro={erros.dificuldade_socializacao}
      />
    </div>
  );
};

export const EtapaSaude = ({ form, erros, set }: Props) => (
  <div className="space-y-5">
    <SecaoTitulo>Saúde e Apoio</SecaoTitulo>
    <RadioGrupo
      label="Uso contínuo de medicação?"
      nome="medicacao"
      opcoes={["Sim", "Não"]}
      valor={form.usa_medicacao}
      onChange={(v) => set("usa_medicacao", v)}
      erro={erros.usa_medicacao}
    />
    {form.usa_medicacao === "Sim" && (
      <Campo label="Qual medicação e para qual finalidade?" erro={erros.medicacao_detalhe}>
        <Textarea
          value={form.medicacao_detalhe}
          onChange={(e) => set("medicacao_detalhe", e.target.value)}
        />
      </Campo>
    )}
    <Campo label="Alergias ou restrições alimentares (opcional)">
      <Textarea
        placeholder="Se houver, descreva aqui"
        value={form.alergias}
        onChange={(e) => set("alergias", e.target.value)}
      />
    </Campo>
    <Campo label="Outras observações de saúde (opcional)">
      <Textarea
        placeholder="Algo que a equipe pedagógica precise saber"
        value={form.observacoes_saude}
        onChange={(e) => set("observacoes_saude", e.target.value)}
      />
    </Campo>
  </div>
);

export const EtapaConsentimento = ({ form, erros, set }: Props) => (
  <div className="space-y-5">
    <SecaoTitulo>Consentimento</SecaoTitulo>
    <label className="flex items-start gap-3 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={form.consentimento_veracidade}
        onChange={(e) => set("consentimento_veracidade", e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      Declaro que todas as informações fornecidas são verdadeiras e foram preenchidas de forma
      responsável.
    </label>
    <label className="flex items-start gap-3 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={form.consentimento_privacidade}
        onChange={(e) => set("consentimento_privacidade", e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span>
        Li e concordo com a{" "}
        <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline">
          Política de Privacidade
        </a>
      </span>
    </label>
    {(erros.consentimento_veracidade || erros.consentimento_privacidade) && (
      <p className="text-xs text-destructive">É necessário aceitar os dois itens para enviar.</p>
    )}
  </div>
);
