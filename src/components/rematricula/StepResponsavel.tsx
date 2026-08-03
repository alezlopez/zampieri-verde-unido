import { useMemo, useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
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
import { ResponsavelForm } from "./types";
import { VerificarContatoDialog } from "./VerificarContatoDialog";
import {
  ESTADOS_CIVIS,
  brToIso,
  buscarCep,
  isValidCpf,
  isValidEmail,
  maskCep,
  maskCpf,
  maskDataBr,
  maskTelefone,
  onlyDigits,
} from "./utils";

interface Props {
  titulo: string;
  descricao: string;
  form: ResponsavelForm;
  travados: Partial<Record<keyof ResponsavelForm, boolean>>;
  idAluno: number;
  celularOriginal: string;
  emailOriginal: string;
  onChange: (form: ResponsavelForm) => void;
  onVoltar: () => void;
  onAvancar: () => void;
}

type Erros = Partial<Record<keyof ResponsavelForm, string>>;

export const StepResponsavel = ({
  titulo,
  descricao,
  form,
  travados,
  idAluno,
  celularOriginal,
  emailOriginal,
  onChange,
  onVoltar,
  onAvancar,
}: Props) => {
  const [erros, setErros] = useState<Erros>({});
  const [editando, setEditando] = useState<Partial<Record<keyof ResponsavelForm, boolean>>>({});
  const [verificados, setVerificados] = useState<{ celular?: string; email?: string }>({});
  const [dialogo, setDialogo] = useState<null | "celular" | "email">(null);

  const set = (campo: keyof ResponsavelForm, valor: string) =>
    onChange({ ...form, [campo]: valor });

  const celularAlterado = useMemo(
    () =>
      !!celularOriginal &&
      onlyDigits(form.celular).length >= 10 &&
      onlyDigits(form.celular) !== onlyDigits(celularOriginal),
    [form.celular, celularOriginal],
  );
  const emailAlterado = useMemo(
    () =>
      !!emailOriginal &&
      isValidEmail(form.email) &&
      form.email.trim().toLowerCase() !== emailOriginal.trim().toLowerCase(),
    [form.email, emailOriginal],
  );

  const celularPendente =
    celularAlterado && onlyDigits(verificados.celular || "") !== onlyDigits(form.celular);
  const emailPendente =
    emailAlterado && (verificados.email || "").toLowerCase() !== form.email.trim().toLowerCase();

  // CPF de mãe/pai já cadastrado não pode ser corrigido
  const naoCorrigivel = (campo: keyof ResponsavelForm) => campo === "cpf";

  const bloqueado = (campo: keyof ResponsavelForm) =>
    !!travados[campo] && (naoCorrigivel(campo) || !editando[campo]);


  const validar = () => {
    const e: Erros = {};
    const obrig: (keyof ResponsavelForm)[] = [
      "nome",
      "cpf",
      "rg",
      "estado_civil",
      "naturalidade",
      "nacionalidade",
      "cep",
      "logradouro",
      "numero",
      "bairro",
      "cidade",
      "estado",
      "data_nascimento",
      "celular",
      "email",
    ];
    obrig.forEach((c) => {
      if (!String(form[c] || "").trim()) e[c] = "Campo obrigatório";
    });
    if (!e.cpf && !isValidCpf(form.cpf)) e.cpf = "CPF inválido";
    if (!e.email && !isValidEmail(form.email)) e.email = "E-mail inválido";
    if (!e.celular && onlyDigits(form.celular).length < 10) e.celular = "Telefone incompleto";
    if (!e.data_nascimento && !brToIso(form.data_nascimento)) e.data_nascimento = "Data inválida";
    if (!e.celular && celularPendente) e.celular = "Confirme o novo telefone com o código";
    if (!e.email && emailPendente) e.email = "Confirme o novo e-mail com o código";
    setErros(e);
    if (Object.keys(e).length === 0) onAvancar();
  };


  const preencherCep = async (valor: string) => {
    const masked = maskCep(valor);
    const next = { ...form, cep: masked };
    onChange(next);
    if (onlyDigits(masked).length === 8) {
      const end = await buscarCep(masked);
      if (end) {
        onChange({
          ...next,
          logradouro: end.logradouro || next.logradouro,
          bairro: end.bairro || next.bairro,
          cidade: end.cidade || next.cidade,
          estado: end.estado || next.estado,
        });
      }
    }
  };

  const cpfInvalidoLive =
    !travados.cpf && onlyDigits(form.cpf).length === 11 && !isValidCpf(form.cpf);

  const campo = (
    key: keyof ResponsavelForm,
    label: string,
    props: { placeholder?: string; mask?: (v: string) => string; inputMode?: "numeric" | "text" | "email" } = {}
  ) => {
    const invalido = key === "cpf" && cpfInvalidoLive;
    return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`resp-${key}`}>{label}</Label>
        {travados[key] && !naoCorrigivel(key) && !editando[key] && (
          <button
            type="button"
            onClick={() => setEditando((p) => ({ ...p, [key]: true }))}
            className="text-xs font-medium text-zampieri-green-dark underline"
          >
            corrigir
          </button>
        )}
      </div>
      <Input
        id={`resp-${key}`}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        value={form[key]}
        readOnly={bloqueado(key)}
        aria-invalid={invalido || undefined}
        className={bloqueado(key) ? "bg-muted" : invalido ? "border-destructive" : undefined}
        onChange={(e) => {
          if (erros[key]) setErros((p) => ({ ...p, [key]: undefined }));
          set(key, props.mask ? props.mask(e.target.value) : e.target.value);
        }}
      />
      {key === "cpf" && travados.cpf && (
        <p className="text-xs text-muted-foreground">CPF já cadastrado e não pode ser alterado.</p>
      )}
      {invalido && !erros.cpf && (
        <p className="text-xs text-destructive">CPF inválido. Confira os números digitados.</p>
      )}
      {erros[key] && <p className="text-xs text-destructive">{erros[key]}</p>}
    </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">{titulo}</h2>
        <p className="text-sm text-muted-foreground mt-1">{descricao}</p>
      </div>

      <div className="space-y-4">
        {campo("nome", "Nome completo")}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campo("cpf", "CPF", { placeholder: "000.000.000-00", mask: maskCpf, inputMode: "numeric" })}
          {campo("rg", "RG")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Estado civil</Label>
              {travados.estado_civil && !editando.estado_civil && (
                <button
                  type="button"
                  onClick={() => setEditando((p) => ({ ...p, estado_civil: true }))}
                  className="text-xs font-medium text-zampieri-green-dark underline"
                >
                  corrigir
                </button>
              )}
            </div>
            <Select
              value={form.estado_civil}
              onValueChange={(v) => set("estado_civil", v)}
              disabled={bloqueado("estado_civil")}
            >
              <SelectTrigger className={bloqueado("estado_civil") ? "bg-muted" : undefined}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {ESTADOS_CIVIS.map((ec) => (
                  <SelectItem key={ec} value={ec}>
                    {ec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erros.estado_civil && <p className="text-xs text-destructive">{erros.estado_civil}</p>}
          </div>
          {campo("data_nascimento", "Data de nascimento", {
            placeholder: "dd/mm/aaaa",
            mask: maskDataBr,
            inputMode: "numeric",
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campo("naturalidade", "Naturalidade", { placeholder: "Cidade de nascimento" })}
          {campo("nacionalidade", "Nacionalidade", { placeholder: "Brasileira" })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            {campo("celular", "Celular", {
              placeholder: "(11) 99999-9999",
              mask: maskTelefone,
              inputMode: "numeric",
            })}
            {celularAlterado && celularPendente && (
              <button
                type="button"
                onClick={() => setDialogo("celular")}
                className="flex items-center gap-1.5 text-xs font-medium text-destructive underline"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Novo telefone: verificar com código
              </button>
            )}
            {celularAlterado && !celularPendente && (
              <p className="flex items-center gap-1.5 text-xs text-zampieri-green-dark">
                <BadgeCheck className="w-3.5 h-3.5" /> Telefone verificado
              </p>
            )}
          </div>
          <div className="space-y-2">
            {campo("email", "E-mail", { placeholder: "email@exemplo.com", inputMode: "email" })}
            {emailAlterado && emailPendente && (
              <button
                type="button"
                onClick={() => setDialogo("email")}
                className="flex items-center gap-1.5 text-xs font-medium text-destructive underline"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Novo e-mail: verificar com código
              </button>
            )}
            {emailAlterado && !emailPendente && (
              <p className="flex items-center gap-1.5 text-xs text-zampieri-green-dark">
                <BadgeCheck className="w-3.5 h-3.5" /> E-mail verificado
              </p>
            )}
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="resp-cep">CEP</Label>
              {travados.cep && !editando.cep && (
                <button
                  type="button"
                  onClick={() => setEditando((p) => ({ ...p, cep: true }))}
                  className="text-xs font-medium text-zampieri-green-dark underline"
                >
                  corrigir
                </button>
              )}
            </div>
            <Input
              id="resp-cep"
              inputMode="numeric"
              placeholder="00000-000"
              value={form.cep}
              readOnly={bloqueado("cep")}
              className={bloqueado("cep") ? "bg-muted" : undefined}
              onChange={(e) => preencherCep(e.target.value)}
            />
            {erros.cep && <p className="text-xs text-destructive">{erros.cep}</p>}
          </div>
          <div className="sm:col-span-2">{campo("logradouro", "Endereço")}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campo("numero", "Número")}
          {campo("complemento", "Complemento (opcional)")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {campo("bairro", "Bairro")}
          {campo("cidade", "Cidade")}
          {campo("estado", "Estado (UF)", { placeholder: "SP" })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button onClick={validar} className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green">
          Continuar
        </Button>
      </div>

      <VerificarContatoDialog
        aberto={dialogo !== null}
        idAluno={idAluno}
        canal={dialogo === "email" ? "email" : "whatsapp"}
        destino={dialogo === "email" ? form.email.trim() : form.celular}
        onFechar={() => setDialogo(null)}
        onVerificado={() =>
          setVerificados((p) =>
            dialogo === "email"
              ? { ...p, email: form.email.trim().toLowerCase() }
              : { ...p, celular: form.celular },
          )
        }
      />
    </div>
  );

};
