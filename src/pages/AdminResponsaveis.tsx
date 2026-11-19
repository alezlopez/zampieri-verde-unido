import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensagemDaFunction } from "@/lib/mensagensErro";

type Resp = "mae" | "pai";
const CAMPOS = {
  mae: { rotulo: "Mãe", nome: "nome_mae", cpf: "cpf_mae", email: "email_mae", telefone: "telefone_mae" },
  pai: { rotulo: "Pai", nome: "nome_pai", cpf: "cpf_pai", email: "email_pai", telefone: "celular_pai" },
} as const;

interface Conta {
  id: string;
  email: string;
  criado_em: string;
  ultimo_acesso: string | null;
  confirmado: boolean;
  trocar_senha: boolean;
}
interface Resultado {
  aluno: Record<string, string | number | null> & { id: number; codigo_aluno: string; nome_aluno: string | null; curso: string | null };
  contas: Record<Resp, Conta | null>;
  irmaos: Record<Resp, { codigo: string; nome: string }[]>;
}
interface Historico {
  created_at: string;
  acao: string;
  responsavel: Resp | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}

const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const mascaraCpf = (v: string) => {
  const d = digitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const mascaraTel = (v: string) => {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}${d.length > 6 ? "-" + d.slice(6) : ""}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const dataHora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "nunca";

const URL_LOGIN = "colegiozampieri.com.br/eventos/login";

const FormResponsavel = ({
  resultado,
  resp,
  aoSalvar,
}: {
  resultado: Resultado;
  resp: Resp;
  aoSalvar: () => void;
}) => {
  const c = CAMPOS[resp];
  const a = resultado.aluno;
  const inicial = {
    nome: String(a[c.nome] ?? ""),
    cpf: mascaraCpf(String(a[c.cpf] ?? "")),
    email: String(a[c.email] ?? ""),
    telefone: mascaraTel(String(a[c.telefone] ?? "")),
  };
  const [form, setForm] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [confirmarAcesso, setConfirmarAcesso] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [acesso, setAcesso] = useState<{ senha: string; cpf: string; email: string; criada: boolean; emailEnviado: boolean } | null>(null);

  const alterado =
    form.nome !== inicial.nome ||
    digitos(form.cpf) !== digitos(inicial.cpf) ||
    form.email.trim().toLowerCase() !== inicial.email.trim().toLowerCase() ||
    digitos(form.telefone) !== digitos(inicial.telefone);
  const conta = resultado.contas[resp];
  const irmaos = resultado.irmaos[resp];

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke("admin-responsaveis", {
      body: { acao: "salvar", id: a.id, responsavel: resp, ...form },
    });
    setSalvando(false);
    if (error || !data?.ok) {
      const msg = await mensagemDaFunction(error, data);
      toast.error(data?.codigo ? `${msg} (aluno ${data.codigo})` : msg);
      return;
    }
    const afetados = (data.alunos_afetados as { codigo: string }[]).length;
    toast.success(afetados > 1 ? `Salvo em ${afetados} alunos da família.` : "Dados salvos.");
    for (const aviso of (data.avisos as string[]) ?? []) toast.info(aviso, { duration: 10000 });
    aoSalvar();
  };

  const gerarAcesso = async () => {
    setConfirmarAcesso(false);
    setGerando(true);
    const { data, error } = await supabase.functions.invoke("admin-responsaveis", {
      body: { acao: "acesso_temporario", id: a.id, responsavel: resp },
    });
    setGerando(false);
    if (error || !data?.ok) {
      toast.error(await mensagemDaFunction(error, data));
      return;
    }
    // Recarregar os dados recria este formulário e apagaria a janela da senha:
    // a atualização fica para quando a janela for fechada (fecharAcesso).
    setAcesso({ senha: data.senha, cpf: data.cpf, email: data.email, criada: data.criada, emailEnviado: !!data.email_enviado });
  };

  const fecharAcesso = () => {
    setAcesso(null);
    aoSalvar();
  };

  const mensagem = acesso
    ? `Olá, ${form.nome.split(" ")[0] || ""}! Seu acesso ao site do Colégio Zampieri está pronto.\n\n` +
      `Entre em ${URL_LOGIN} com:\nCPF: ${mascaraCpf(acesso.cpf)}\nSenha temporária: ${acesso.senha}\n\n` +
      "No primeiro acesso, o site vai pedir para você criar uma senha nova."
    : "";

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };

  return (
    <form onSubmit={salvar} className="rounded-xl border bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserRound className="w-5 h-5 text-zampieri-green-dark" aria-hidden="true" />
        <h3 className="font-semibold text-lg text-zampieri-green-dark">{c.rotulo}</h3>
      </div>
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${resp}-nome`}>Nome</Label>
          <Input id={`${resp}-nome`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={150} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${resp}-cpf`}>CPF</Label>
            <Input id={`${resp}-cpf`} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: mascaraCpf(e.target.value) })} inputMode="numeric" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${resp}-tel`}>Telefone</Label>
            <Input id={`${resp}-tel`} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTel(e.target.value) })} inputMode="tel" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${resp}-email`}>E-mail (usado no login)</Label>
          <Input id={`${resp}-email`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>

      {irmaos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Salvar também atualiza os irmãos: {irmaos.map((i) => `${i.nome} (${i.codigo})`).join(", ")}.
        </p>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
        <p className="font-medium flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Conta de acesso
        </p>
        {conta ? (
          <p className="text-muted-foreground">
            Existe · último acesso: {dataHora(conta.ultimo_acesso)}
            {conta.trocar_senha && <span className="block text-amber-700 font-medium">Aguardando a troca da senha temporária</span>}
          </p>
        ) : (
          <p className="text-muted-foreground">Ainda não tem conta com este e-mail.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!alterado || salvando} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
          {salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Salvar {c.rotulo.toLowerCase()}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={alterado || gerando}
          onClick={() => setConfirmarAcesso(true)}
          title={alterado ? "Salve as alterações antes de gerar o acesso" : undefined}
        >
          {gerando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
          Gerar acesso temporário
        </Button>
      </div>
      {alterado && <p className="text-xs text-amber-700">Salve as alterações antes de gerar o acesso.</p>}

      <AlertDialog open={confirmarAcesso} onOpenChange={setConfirmarAcesso}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar acesso temporário?</AlertDialogTitle>
            <AlertDialogDescription>
              {conta
                ? `A senha atual de ${inicial.email} deixa de funcionar e a nova senha temporária é enviada para este e-mail. ${c.rotulo === "Mãe" ? "A mãe" : "O pai"} entra com o CPF e cria uma senha nova no primeiro acesso.`
                : `Será criada uma conta para ${inicial.email} e a senha temporária é enviada para este e-mail. ${c.rotulo === "Mãe" ? "A mãe" : "O pai"} entra com o CPF e cria uma senha nova no primeiro acesso.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={gerarAcesso}>Gerar senha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!acesso} onOpenChange={(v) => !v && fecharAcesso()}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Acesso temporário {acesso?.criada ? "criado" : "gerado"}</DialogTitle>
            <DialogDescription>
              Esta senha aparece só agora. Ao entrar, a família cria a senha definitiva.
            </DialogDescription>
          </DialogHeader>
          {acesso?.emailEnviado ? (
            <p className="rounded-lg bg-zampieri-green-dark/10 p-3 text-sm text-zampieri-green-dark">
              E-mail com a senha enviado para <strong>{acesso.email}</strong>.
            </p>
          ) : (
            <p role="alert" className="rounded-lg bg-amber-50 border border-amber-300 p-3 text-sm text-amber-900">
              O e-mail não foi enviado. Mande a senha pelo WhatsApp com o botão abaixo.
            </p>
          )}
          <div className="rounded-lg bg-zampieri-cream p-4 space-y-1 text-sm">
            <p>CPF: <strong>{acesso && mascaraCpf(acesso.cpf)}</strong></p>
            <p>
              Senha temporária: <strong className="font-mono text-lg tracking-wider select-all">{acesso?.senha}</strong>
            </p>
            <p className="text-muted-foreground">Login em {URL_LOGIN}</p>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border p-3 text-xs bg-white">{mensagem}</pre>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => acesso && copiar(acesso.senha)} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
              <Copy className="w-4 h-4 mr-1" /> Copiar senha
            </Button>
            <Button variant="outline" onClick={() => copiar(mensagem)}>
              <Copy className="w-4 h-4 mr-1" /> Copiar mensagem
            </Button>
            {form.telefone && (
              <Button variant="outline" asChild>
                <a href={`https://wa.me/55${digitos(form.telefone)}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer">
                  Enviar no WhatsApp
                </a>
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={fecharAcesso}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
};

const AdminResponsaveis = () => {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [versao, setVersao] = useState(0);

  const buscar = async (cod = codigo) => {
    const termo = cod.trim();
    if (!termo) return;
    setBuscando(true);
    const { data, error } = await supabase.functions.invoke("admin-responsaveis", { body: { acao: "buscar", codigo: termo } });
    setBuscando(false);
    if (error || !data?.ok) {
      setResultados([]);
      setHistorico([]);
      toast.error(await mensagemDaFunction(error, data));
      return;
    }
    setResultados(data.resultado as Resultado[]);
    setHistorico(data.historico as Historico[]);
    setVersao((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/40">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-zampieri-green-dark">Responsáveis e acesso</h1>
          <p className="text-sm text-muted-foreground">
            Corrija nome, CPF, e-mail e telefone dos responsáveis (tabela alunos_26) e gere acesso temporário para quem
            esqueceu a senha ou trocou de e-mail.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar();
          }}
          className="flex gap-2 max-w-md"
        >
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} placeholder="Código do aluno" inputMode="numeric" aria-label="Código do aluno" />
          <Button type="submit" disabled={buscando || !codigo} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-1">Buscar</span>
          </Button>
        </form>

        {resultados.map((r) => (
          <section key={`${r.aluno.id}-${versao}`} className="space-y-4">
            <div className="rounded-xl bg-zampieri-green-dark text-white p-4">
              <p className="font-serif text-xl font-bold">{r.aluno.nome_aluno}</p>
              <p className="text-sm text-white/80">
                Código {r.aluno.codigo_aluno} · {r.aluno.curso}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {(["mae", "pai"] as Resp[]).map((resp) => (
                <FormResponsavel key={resp} resultado={r} resp={resp} aoSalvar={() => buscar(String(r.aluno.codigo_aluno))} />
              ))}
            </div>
          </section>
        ))}

        {resultados.length > 0 && historico.length > 0 && (
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold text-zampieri-green-dark mb-3">Últimas alterações</h2>
            <ul className="divide-y text-sm">
              {historico.map((h, i) => (
                <li key={i} className="py-2">
                  <span className="text-muted-foreground">{dataHora(h.created_at)}</span> ·{" "}
                  {h.acao === "acesso_temporario" ? "Acesso temporário gerado" : "Dados editados"}
                  {h.responsavel && ` (${CAMPOS[h.responsavel].rotulo.toLowerCase()})`}
                  {h.acao === "editar" && h.antes && h.depois && (
                    <span className="block text-xs text-muted-foreground">
                      {Object.keys(h.depois)
                        .filter((k) => String(h.antes?.[k] ?? "") !== String(h.depois?.[k] ?? ""))
                        .map((k) => `${k}: ${h.antes?.[k] || "—"} → ${h.depois?.[k] || "—"}`)
                        .join(" · ") || "sem mudança"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminResponsaveis;
