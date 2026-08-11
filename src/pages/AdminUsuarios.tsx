import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldCheck, Trash2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const PAPEIS: { valor: string; rotulo: string; descricao: string }[] = [
  { valor: "admin", rotulo: "Administrador", descricao: "Acesso total a todas as áreas" },
  { valor: "matricula", rotulo: "Matrículas", descricao: "Pré-matrícula, entrevistas e documentos" },
  { valor: "rematricula", rotulo: "Rematrícula", descricao: "Rematrículas 2027 e follow-up" },
  { valor: "eventos", rotulo: "Eventos", descricao: "Eventos, ingressos e relatórios" },
  { valor: "produtos", rotulo: "Produtos", descricao: "Catálogo, estoque e pedidos" },
  { valor: "portaria", rotulo: "Portaria", descricao: "Scanner de ingressos e retiradas" },
  { valor: "conferente", rotulo: "Conferente", descricao: "Somente conferência na portaria" },
];

const ERROS: Record<string, string> = {
  email_invalido: "E-mail inválido.",
  senha_curta: "A senha precisa ter pelo menos 8 caracteres.",
  sem_papeis: "Selecione pelo menos uma permissão.",
  email_em_uso: "Já existe uma conta com este e-mail. Use a lista abaixo para dar permissões a ela.",
  nao_remova_seu_admin: "Você não pode remover o próprio acesso de administrador.",
  nao_remova_a_si: "Você não pode remover o próprio acesso.",
  sem_permissao: "Apenas administradores podem gerenciar usuários.",
};

interface Usuario {
  user_id: string;
  email: string;
  criado_em: string | null;
  papeis: string[];
}

const chamar = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body });
  if (error && !data) throw new Error("falha_rede");
  return data as { ok?: boolean; error?: string; usuarios?: Usuario[] };
};

const AdminUsuarios = () => {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [novosPapeis, setNovosPapeis] = useState<string[]>([]);

  const falhar = (code?: string) =>
    toast({ title: ERROS[code || ""] || "Não foi possível concluir", variant: "destructive" });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await chamar({ acao: "listar" });
      if (!data?.ok) return falhar(data?.error);
      setUsuarios(data.usuarios ?? []);
    } catch {
      falhar();
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Usuários e Permissões — Colégio Zampieri";
    carregar();
  }, [carregar]);

  const criar = async () => {
    setSalvando("novo");
    try {
      const data = await chamar({ acao: "criar", email, senha, papeis: novosPapeis });
      if (!data?.ok) return falhar(data?.error);
      toast({ title: "Usuário criado com sucesso" });
      setEmail("");
      setSenha("");
      setNovosPapeis([]);
      carregar();
    } catch {
      falhar();
    } finally {
      setSalvando(null);
    }
  };

  const alternarPapel = async (u: Usuario, papel: string) => {
    const papeis = u.papeis.includes(papel)
      ? u.papeis.filter((p) => p !== papel)
      : [...u.papeis, papel];
    setSalvando(u.user_id);
    try {
      const data = await chamar({ acao: "atualizar_papeis", user_id: u.user_id, papeis });
      if (!data?.ok) return falhar(data?.error);
      setUsuarios((lista) =>
        lista.map((x) => (x.user_id === u.user_id ? { ...x, papeis } : x)),
      );
    } catch {
      falhar();
    } finally {
      setSalvando(null);
    }
  };

  const redefinirSenha = async (u: Usuario) => {
    const nova = window.prompt(`Nova senha para ${u.email} (mínimo 8 caracteres):`);
    if (!nova) return;
    setSalvando(u.user_id);
    try {
      const data = await chamar({ acao: "redefinir_senha", user_id: u.user_id, senha: nova });
      if (!data?.ok) return falhar(data?.error);
      toast({ title: "Senha atualizada" });
    } catch {
      falhar();
    } finally {
      setSalvando(null);
    }
  };

  const removerAcesso = async (u: Usuario) => {
    if (!window.confirm(`Remover todos os acessos administrativos de ${u.email}?`)) return;
    setSalvando(u.user_id);
    try {
      const data = await chamar({ acao: "remover_acesso", user_id: u.user_id });
      if (!data?.ok) return falhar(data?.error);
      toast({ title: "Acessos removidos" });
      setUsuarios((lista) => lista.filter((x) => x.user_id !== u.user_id));
    } catch {
      falhar();
    } finally {
      setSalvando(null);
    }
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
              Usuários e Permissões
            </h1>
            <p className="text-xs text-muted-foreground">
              Crie contas administrativas e defina o que cada pessoa acessa.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-24">
        <section className="rounded-lg border border-border bg-white p-5 space-y-4">
          <h2 className="font-serif text-lg font-bold text-zampieri-green-dark flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo usuário
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@colegiozampieri.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha provisória</Label>
              <Input
                id="senha"
                type="text"
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAPEIS.map((p) => (
                <label
                  key={p.valor}
                  className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:border-zampieri-green-dark"
                >
                  <Checkbox
                    checked={novosPapeis.includes(p.valor)}
                    onCheckedChange={(v) =>
                      setNovosPapeis((atual) =>
                        v ? [...atual, p.valor] : atual.filter((x) => x !== p.valor),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zampieri-green-dark">
                      {p.rotulo}
                    </span>
                    <span className="block text-xs text-muted-foreground">{p.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={criar} disabled={salvando === "novo"}>
            {salvando === "novo" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar usuário
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-zampieri-green-dark flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Usuários com acesso ({usuarios.length})
          </h2>

          {carregando ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="rounded-lg border border-border bg-white p-6 text-sm text-muted-foreground">
              Nenhum usuário com permissões cadastradas.
            </p>
          ) : (
            usuarios.map((u) => (
              <div key={u.user_id} className="rounded-lg border border-border bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zampieri-green-dark break-all">{u.email}</p>
                  <div className="flex items-center gap-2">
                    {salvando === u.user_id && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    <Button variant="outline" size="sm" onClick={() => redefinirSenha(u)}>
                      <KeyRound className="w-4 h-4 mr-2" /> Senha
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removerAcesso(u)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remover
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PAPEIS.map((p) => {
                    const ativo = u.papeis.includes(p.valor);
                    return (
                      <button
                        key={p.valor}
                        type="button"
                        onClick={() => alternarPapel(u, p.valor)}
                        disabled={salvando === u.user_id}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          ativo
                            ? "border-zampieri-green-dark bg-zampieri-green-dark text-white"
                            : "border-border bg-white text-muted-foreground hover:border-zampieri-green-dark"
                        }`}
                      >
                        {p.rotulo}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminUsuarios;
