import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  brToIso,
  buscarCep,
  ESTADOS_CIVIS,
  isValidCpf,
  isValidEmail,
  isoToBr,
  maskCep,
  maskCpf,
  maskDataBr,
  maskTelefone,
  onlyDigits,
} from "@/components/rematricula/utils";

type Dados = Record<string, string>;

interface Props {
  dados: Dados;
  respTipo: string | null;
  salvando: boolean;
  onSalvar: (dados: Dados) => void;
}

const CAMPO = (
  label: string,
  valor: string,
  onChange: (v: string) => void,
  erro?: string,
  extra?: { placeholder?: string; type?: string },
) => (
  <div className="space-y-1.5" key={label}>
    <Label className="text-xs">{label}</Label>
    <Input
      value={valor}
      placeholder={extra?.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    {erro && <p className="text-xs text-destructive">{erro}</p>}
  </div>
);

const camposPessoa = (p: "pai" | "mae") => ({
  nome: `nome_${p}`,
  cpf: `cpf_${p}`,
  rg: `rg_${p}`,
  estadoCivil: `estado_civil_${p}`,
  naturalidade: `naturalidade_${p}`,
  nacionalidade: `nacionalidade_${p}`,
  profissao: `profissao_${p}`,
  nascimento: `data_nascimento_${p}`,
  celular: `celular_${p}`,
  email: `email_${p}`,
});

const FormDadosContrato = ({ dados, respTipo, salvando, onSalvar }: Props) => {
  const [f, setF] = useState<Dados>(() => ({
    ...dados,
    resp_fin_quem: dados.resp_fin_quem || respTipo || "",
    cpf_pai: maskCpf(dados.cpf_pai || ""),
    cpf_mae: maskCpf(dados.cpf_mae || ""),
    resp_fin_cpf: maskCpf(dados.resp_fin_cpf || ""),
    celular_pai: maskTelefone(dados.celular_pai || ""),
    celular_mae: maskTelefone(dados.celular_mae || ""),
    resp_fin_celular: maskTelefone(dados.resp_fin_celular || ""),
    cep: maskCep(dados.cep || ""),
    data_nascimento_pai: isoToBr(dados.data_nascimento_pai),
    data_nascimento_mae: isoToBr(dados.data_nascimento_mae),
    resp_fin_data_nascimento: isoToBr(dados.resp_fin_data_nascimento),
  }));
  const [erros, setErros] = useState<Dados>({});
  const [buscandoCep, setBuscandoCep] = useState(false);

  const set = (campo: string, valor: string) => setF((p) => ({ ...p, [campo]: valor }));

  const quem = f.resp_fin_quem as "pai" | "mae" | "";

  // Replica os dados do pai ou da mãe no bloco do responsável financeiro.
  // Campos de origem vazios não apagam o que já estiver preenchido.
  useEffect(() => {
    if (quem !== "pai" && quem !== "mae") return;
    const c = camposPessoa(quem);
    setF((p) => {
      const m = (origem: string, destino: string) => (p[origem] || p[destino] || "");
      return {
        ...p,
        resp_fin_nome: m(c.nome, "resp_fin_nome"),
        resp_fin_cpf: m(c.cpf, "resp_fin_cpf"),
        resp_fin_rg: m(c.rg, "resp_fin_rg"),
        resp_fin_estado_civil: m(c.estadoCivil, "resp_fin_estado_civil"),
        resp_fin_naturalidade: m(c.naturalidade, "resp_fin_naturalidade"),
        resp_fin_nacionalidade: m(c.nacionalidade, "resp_fin_nacionalidade"),
        resp_fin_profissao: m(c.profissao, "resp_fin_profissao"),
        resp_fin_data_nascimento: m(c.nascimento, "resp_fin_data_nascimento"),
        resp_fin_celular: m(c.celular, "resp_fin_celular"),
        resp_fin_email: m(c.email, "resp_fin_email"),
      };
    });
  }, [

    quem,
    f.nome_pai, f.cpf_pai, f.rg_pai, f.estado_civil_pai, f.naturalidade_pai,
    f.nacionalidade_pai, f.profissao_pai, f.data_nascimento_pai, f.celular_pai, f.email_pai,
    f.nome_mae, f.cpf_mae, f.rg_mae, f.estado_civil_mae, f.naturalidade_mae,
    f.nacionalidade_mae, f.profissao_mae, f.data_nascimento_mae, f.celular_mae, f.email_mae,
  ]);

  const preencherCep = async (valor: string) => {
    const masked = maskCep(valor);
    set("cep", masked);
    if (onlyDigits(masked).length !== 8) return;
    setBuscandoCep(true);
    const end = await buscarCep(masked);
    setBuscandoCep(false);
    if (end) {
      setF((p) => ({
        ...p,
        logradouro: end.logradouro || p.logradouro || "",
        bairro: end.bairro || p.bairro || "",
        cidade: end.cidade || p.cidade || "",
        estado: end.estado || p.estado || "",
      }));
    }
  };

  const validar = () => {
    const e: Dados = {};
    if (quem !== "pai" && quem !== "mae") e.resp_fin_quem = "Escolha o responsável financeiro";
    const obrig: [string, string][] = [
      ["resp_fin_nome", "Informe o nome"],
      ["resp_fin_rg", "Informe o RG"],
      ["resp_fin_estado_civil", "Informe o estado civil"],
      ["resp_fin_naturalidade", "Informe a naturalidade"],
      ["resp_fin_nacionalidade", "Informe a nacionalidade"],
      ["resp_fin_profissao", "Informe a profissão"],
      ["cep", "Informe o CEP"],
      ["logradouro", "Informe o logradouro"],
      ["numero", "Informe o número"],
      ["bairro", "Informe o bairro"],
      ["cidade", "Informe a cidade"],
      ["estado", "Informe o estado"],
    ];
    obrig.forEach(([campo, msg]) => {
      if (!String(f[campo] ?? "").trim()) e[campo] = msg;
    });
    if (!isValidCpf(f.resp_fin_cpf || "")) e.resp_fin_cpf = "CPF inválido";
    if (!isValidEmail(f.resp_fin_email || "")) e.resp_fin_email = "E-mail inválido";
    if (onlyDigits(f.resp_fin_celular || "").length < 10) e.resp_fin_celular = "Celular incompleto";
    if (!brToIso(f.resp_fin_data_nascimento || "")) e.resp_fin_data_nascimento = "Data inválida";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const enviar = () => {
    if (!validar()) return;
    const payload: Dados = { ...f };
    ["resp_fin_cpf", "cpf_pai", "cpf_mae"].forEach((c) => (payload[c] = onlyDigits(payload[c] || "")));
    ["resp_fin_celular", "celular_pai", "celular_mae"].forEach(
      (c) => (payload[c] = onlyDigits(payload[c] || "")),
    );
    payload.cep = onlyDigits(payload.cep || "");
    ["resp_fin_data_nascimento", "data_nascimento_pai", "data_nascimento_mae"].forEach((c) => {
      payload[c] = brToIso(payload[c] || "") ?? "";
    });
    onSalvar(payload);
  };

  const blocoPessoa = (titulo: string, p: "pai" | "mae") => {
    const c = camposPessoa(p);
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{titulo}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CAMPO(`Nome completo`, f[c.nome] || "", (v) => set(c.nome, v))}
          {CAMPO(`CPF`, f[c.cpf] || "", (v) => set(c.cpf, maskCpf(v)), undefined, {
            placeholder: "000.000.000-00",
          })}
          {CAMPO(`RG`, f[c.rg] || "", (v) => set(c.rg, v))}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado civil</Label>
            <Select value={f[c.estadoCivil] || ""} onValueChange={(v) => set(c.estadoCivil, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {ESTADOS_CIVIS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {CAMPO(`Naturalidade`, f[c.naturalidade] || "", (v) => set(c.naturalidade, v))}
          {CAMPO(`Nacionalidade`, f[c.nacionalidade] || "", (v) => set(c.nacionalidade, v), undefined, {
            placeholder: "Brasileira",
          })}
          {CAMPO(`Profissão`, f[c.profissao] || "", (v) => set(c.profissao, v))}
          {CAMPO(`Data de nascimento`, f[c.nascimento] || "", (v) => set(c.nascimento, maskDataBr(v)), undefined, {
            placeholder: "DD/MM/AAAA",
          })}
          {CAMPO(`Celular`, f[c.celular] || "", (v) => set(c.celular, maskTelefone(v)), undefined, {
            placeholder: "(11) 99999-9999",
          })}
          {CAMPO(`E-mail`, f[c.email] || "", (v) => set(c.email, v))}
        </div>
      </div>
    );
  };

  const resumoResp = useMemo(
    () => (quem === "pai" ? "os dados do pai" : quem === "mae" ? "os dados da mãe" : ""),
    [quem],
  );

  return (
    <div className="space-y-6">
      {blocoPessoa("Dados do pai", "pai")}
      {blocoPessoa("Dados da mãe", "mae")}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Responsável financeiro
        </p>
        <p className="text-xs text-muted-foreground">
          Dados trazidos da sua pré-matrícula — confira e ajuste se precisar.
        </p>
        <div className="space-y-1.5">

          <Label className="text-xs">Quem será o responsável financeiro?</Label>
          <Select value={f.resp_fin_quem || ""} onValueChange={(v) => set("resp_fin_quem", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="pai">Pai</SelectItem>
              <SelectItem value="mae">Mãe</SelectItem>
            </SelectContent>
          </Select>
          {erros.resp_fin_quem && <p className="text-xs text-destructive">{erros.resp_fin_quem}</p>}
          {resumoResp && (
            <p className="text-xs text-muted-foreground">
              Usaremos {resumoResp} no contrato. Confira abaixo e ajuste se precisar.
            </p>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {CAMPO("Nome completo", f.resp_fin_nome || "", (v) => set("resp_fin_nome", v), erros.resp_fin_nome)}
          {CAMPO("CPF", f.resp_fin_cpf || "", (v) => set("resp_fin_cpf", maskCpf(v)), erros.resp_fin_cpf)}
          {CAMPO("RG", f.resp_fin_rg || "", (v) => set("resp_fin_rg", v), erros.resp_fin_rg)}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado civil</Label>
            <Select
              value={f.resp_fin_estado_civil || ""}
              onValueChange={(v) => set("resp_fin_estado_civil", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {ESTADOS_CIVIS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erros.resp_fin_estado_civil && (
              <p className="text-xs text-destructive">{erros.resp_fin_estado_civil}</p>
            )}
          </div>
          {CAMPO("Naturalidade", f.resp_fin_naturalidade || "", (v) => set("resp_fin_naturalidade", v), erros.resp_fin_naturalidade)}
          {CAMPO("Nacionalidade", f.resp_fin_nacionalidade || "", (v) => set("resp_fin_nacionalidade", v), erros.resp_fin_nacionalidade)}
          {CAMPO("Profissão", f.resp_fin_profissao || "", (v) => set("resp_fin_profissao", v), erros.resp_fin_profissao)}
          {CAMPO("Data de nascimento", f.resp_fin_data_nascimento || "", (v) => set("resp_fin_data_nascimento", maskDataBr(v)), erros.resp_fin_data_nascimento, { placeholder: "DD/MM/AAAA" })}
          {CAMPO("Celular", f.resp_fin_celular || "", (v) => set("resp_fin_celular", maskTelefone(v)), erros.resp_fin_celular)}
          {CAMPO("E-mail", f.resp_fin_email || "", (v) => set("resp_fin_email", v), erros.resp_fin_email)}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Endereço</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">CEP</Label>
            <div className="relative">
              <Input
                value={f.cep || ""}
                placeholder="00000-000"
                onChange={(e) => preencherCep(e.target.value)}
              />
              {buscandoCep && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {erros.cep && <p className="text-xs text-destructive">{erros.cep}</p>}
          </div>
          {CAMPO("Logradouro", f.logradouro || "", (v) => set("logradouro", v), erros.logradouro)}
          {CAMPO("Número", f.numero || "", (v) => set("numero", v), erros.numero)}
          {CAMPO("Complemento", f.complemento || "", (v) => set("complemento", v))}
          {CAMPO("Bairro", f.bairro || "", (v) => set("bairro", v), erros.bairro)}
          {CAMPO("Cidade", f.cidade || "", (v) => set("cidade", v), erros.cidade)}
          {CAMPO("Estado (UF)", f.estado || "", (v) => set("estado", v.toUpperCase().slice(0, 2)), erros.estado)}
        </div>
      </div>

      <Button
        className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
        disabled={salvando}
        onClick={enviar}
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e gerar contrato"}
      </Button>
    </div>
  );
};

export default FormDadosContrato;
