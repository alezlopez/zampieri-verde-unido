import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { maskCpf, maskDataBr, maskTelefone } from "@/components/rematricula/utils";
import { Campo, RadioGrupo, SecaoTitulo } from "./Campos";
import { PreMatriculaForm, SERIES } from "./types";

type Erros = Partial<Record<keyof PreMatriculaForm, string>>;

interface Props {
  form: PreMatriculaForm;
  erros: Erros;
  set: <K extends keyof PreMatriculaForm>(campo: K, valor: PreMatriculaForm[K]) => void;
  boletim: File | null;
  laudo: File | null;
  setBoletim: (f: File | null) => void;
  setLaudo: (f: File | null) => void;
}

const ACEITOS = ".pdf,.jpg,.jpeg,.png";

export const EtapaResponsavel = ({ form, erros, set }: Props) => (
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
          <SelectItem value="outro">Outro</SelectItem>
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
  </div>
);

export const EtapaAluno = ({ form, erros, set }: Props) => (
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
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a série" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {SERIES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
    <RadioGrupo
      label="Turno de preferência"
      nome="turno"
      opcoes={["Manhã", "Tarde"]}
      valor={form.turno_preferencia}
      onChange={(v) => set("turno_preferencia", v)}
      erro={erros.turno_preferencia}
    />
    <Campo label="Nome da escola atual" erro={erros.escola_atual}>
      <Input
        placeholder="Digite o nome da escola atual"
        value={form.escola_atual}
        onChange={(e) => set("escola_atual", e.target.value)}
      />
    </Campo>
    <RadioGrupo
      label="Tipo de escola"
      nome="tipo_escola"
      opcoes={["Pública", "Privada"]}
      valor={form.tipo_escola}
      onChange={(v) => set("tipo_escola", v)}
      erro={erros.tipo_escola}
    />
  </div>
);

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
      label="Upload do boletim escolar (opcional)"
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
