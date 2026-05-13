import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { validatePasswordStrength, translatePasswordError, PASSWORD_REQUIREMENTS_TEXT } from "@/lib/passwordValidation";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    const pwErr = validatePasswordStrength(password);
    if (pwErr) {
      toast({ title: "Senha inválida", description: `${pwErr} ${PASSWORD_REQUIREMENTS_TEXT}`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const friendlyPw = translatePasswordError(error.message);
        toast({
          title: friendlyPw ? "Senha não atende aos requisitos" : "Erro",
          description: friendlyPw || error.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({ title: "Senha alterada com sucesso!" });
        setTimeout(() => navigate("/eventos"), 3000);
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Redefinir senha" />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <Footer />
    </div>
  );

  if (!isRecovery) {
    return (
      <Shell>
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-zampieri-green-dark">Link inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido ou expirou. Solicite um novo link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/eventos/login">
              <Button className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white">Voltar ao login</Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-zampieri-green mx-auto mb-3" />
            <CardTitle className="font-serif text-zampieri-green-dark">Senha alterada!</CardTitle>
            <CardDescription>Redirecionando para a página de eventos...</CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link to="/eventos/login" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar ao login
      </Link>

      <Card className="border-border shadow-lg">
        <CardHeader className="text-center border-b border-zampieri-gold/30 pb-6">
          <CardTitle className="font-serif text-2xl text-zampieri-green-dark">Nova Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha forte"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Confirmar senha</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white" disabled={loading}>
              {loading ? "Aguarde..." : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
};

export default ResetPassword;
