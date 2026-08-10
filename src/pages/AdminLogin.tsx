import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Lock } from "lucide-react";
import { useAuth, SETORES } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "******";
  return `******${local.slice(-4)}@${domain}`;
};

const AdminLogin = () => {
  const { signIn, isAdmin, canScan, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [esqueci, setEsqueci] = useState(false);

  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo;

  useEffect(() => {
    document.title = "Painel Administrativo — Colégio Zampieri";
  }, []);

  // Se já estiver autenticado com permissão, entra direto
  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) navigate(redirectTo || "/admin", { replace: true });
    else if (canScan) navigate(redirectTo || "/eventos/admin/scanner", { replace: true });
  }, [authLoading, isAdmin, canScan, navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast({ title: "Erro no login", description: error.message, variant: "destructive" });
        return;
      }
      const { data: { user: authed } } = await supabase.auth.getUser();
      if (!authed) {
        toast({ title: "Erro no login", description: "Sessão não iniciada.", variant: "destructive" });
        return;
      }
      const [{ data: adminRole }, { data: confRole }, ...setoresRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: authed.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: authed.id, _role: "conferente" as never }),
        ...SETORES.map((s) => supabase.rpc("has_setor" as never, { _user_id: authed.id, _setor: s } as never)),
      ]);
      const temSetor = setoresRes.some((r) => !!r.data);
      if (!adminRole && !confRole && !temSetor) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso negado",
          description: "Esta conta não possui permissão administrativa.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Login realizado com sucesso!" });
      if (redirectTo) navigate(redirectTo, { replace: true });
      else navigate("/admin", { replace: true });

    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Informe o e-mail", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "E-mail enviado!",
        description: `Link de redefinição enviado para ${maskEmail(email.trim())}`,
      });
      setEsqueci(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zampieri-cream/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-zampieri-green-dark flex items-center justify-center mb-2">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <CardTitle className="font-serif text-zampieri-green-dark">
            {esqueci ? "Esqueci minha senha" : "Painel Administrativo"}
          </CardTitle>
          <CardDescription>
            {esqueci
              ? "Informe seu e-mail para receber o link de redefinição"
              : "Acesso restrito à equipe do Colégio Zampieri"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={esqueci ? handleReset : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@colegiozampieri.com.br"
                required
              />
            </div>

            {!esqueci && (
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-zampieri-green-dark hover:bg-zampieri-green"
            >
              {loading ? "Aguarde…" : esqueci ? "Enviar link" : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setEsqueci((v) => !v)}
              className="text-zampieri-green-dark underline"
            >
              {esqueci ? "Voltar ao login" : "Esqueci minha senha"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
