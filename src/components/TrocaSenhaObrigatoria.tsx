import { FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_REQUIREMENTS_TEXT, translatePasswordError, validatePasswordStrength } from "@/lib/passwordValidation";
import { mensagemAmigavel } from "@/lib/mensagensErro";

/**
 * Quem entrou com uma senha temporária gerada pela secretaria (user_metadata.trocar_senha)
 * precisa criar a própria senha antes de usar o site.
 */
export const TrocaSenhaObrigatoria = () => {
  const { user, signOut } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!user?.user_metadata?.trocar_senha) return null;

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    const fraca = validatePasswordStrength(senha);
    if (fraca) return setErro(fraca);
    if (senha !== confirma) return setErro("As senhas não são iguais.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha, data: { trocar_senha: false } });
    setSalvando(false);
    if (error) {
      setErro(
        /same|different from the old/i.test(error.message)
          ? "Escolha uma senha diferente da senha temporária."
          : translatePasswordError(error.message) || mensagemAmigavel(error),
      );
      return;
    }
    setSenha("");
    setConfirma("");
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="troca-senha-titulo" className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={salvar} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-zampieri-green-dark" aria-hidden="true" />
          <h2 id="troca-senha-titulo" className="font-serif text-xl font-bold text-zampieri-green-dark">Crie sua nova senha</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Você entrou com uma senha temporária enviada pela secretaria. Para continuar, crie uma senha só sua.
        </p>
        <div className="space-y-1">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <Input id="nova-senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirma-senha">Repita a nova senha</Label>
          <Input id="confirma-senha" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
        {erro && <p role="alert" className="text-sm text-destructive font-medium">{erro}</p>}
        <Button type="submit" disabled={salvando} className="w-full bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
          {salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Salvar nova senha
        </Button>
        <button type="button" onClick={() => signOut()} className="w-full text-xs text-muted-foreground underline">
          Sair
        </button>
      </form>
    </div>
  );
};
