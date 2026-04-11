import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logoZampieri from "@/assets/logo-zampieri.png";

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "******";
  const visible = local.slice(-4);
  return `******${visible}@${domain}`;
};

const EventosLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCpf, setForgotCpf] = useState("");

  const { loginWithCpf, registerWithCpf, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let email = forgotEmail;

      if (!isAdminLogin && forgotCpf) {
        const { data, error } = await supabase.rpc("find_email_by_cpf", { p_cpf: forgotCpf.replace(/\D/g, "") });
        if (error || !data || data.length === 0) {
          toast({ title: "CPF não encontrado", description: "Verifique se o CPF está cadastrado na escola.", variant: "destructive" });
          setLoading(false);
          return;
        }
        email = data[0].email;
      }

      if (!email) {
        toast({ title: "Erro", description: "Informe o e-mail ou CPF.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const masked = maskEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "E-mail enviado!", description: `Link de redefinição enviado para ${masked}` });
        setIsForgotPassword(false);
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isAdminLogin) {
        const { error } = await signIn(adminEmail, password);
        if (error) {
          toast({ title: "Erro no login", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Login realizado com sucesso!" });
          navigate("/eventos");
        }
      } else if (isRegister) {
        const { error, needsConfirmation } = await registerWithCpf(cpf, password);
        if (error) {
          toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
        } else if (needsConfirmation) {
          toast({
            title: "Cadastro realizado!",
            description: "Verifique seu e-mail para confirmar a conta.",
          });
        }
      } else {
        const { error } = await loginWithCpf(cpf, password);
        if (error) {
          toast({ title: "Erro no login", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Login realizado com sucesso!" });
          navigate("/eventos");
        }
      }
    } catch (err: any) {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/eventos" className="inline-flex items-center text-green-700 hover:text-green-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para eventos
        </Link>

        <Card className="border-green-100 shadow-lg">
          <CardHeader className="text-center">
            <img
                src={logoZampieri}
              alt="Logo"
              className="h-16 w-16 rounded-full mx-auto mb-3"
            />
            <CardTitle className="text-green-800">
              {isForgotPassword ? "Esqueci minha senha" : isAdminLogin ? "Login Administrativo" : isRegister ? "Criar Conta" : "Entrar"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? isAdminLogin ? "Informe seu e-mail para receber o link de redefinição" : "Informe seu CPF para receber o link de redefinição"
                : isAdminLogin
                ? "Acesse com seu e-mail administrativo"
                : isRegister
                ? "Cadastre-se com seu CPF para comprar ingressos"
                : "Use seu CPF cadastrado na escola"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {isAdminLogin ? (
                  <div>
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-foreground">CPF</label>
                    <Input
                      value={forgotCpf}
                      onChange={(e) => setForgotCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      required
                      maxLength={14}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading ? "Aguarde..." : "Enviar link de redefinição"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-green-700 hover:underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isAdminLogin ? (
                    <div>
                      <label className="text-sm font-medium text-foreground">E-mail</label>
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground">CPF</label>
                      <Input
                        value={cpf}
                        onChange={handleCpfChange}
                        placeholder="000.000.000-00"
                        required
                        maxLength={14}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isRegister ? "Crie uma senha (mín. 6 caracteres)" : "Sua senha"}
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
                  </div>

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Aguarde..." : isAdminLogin ? "Entrar" : isRegister ? "Cadastrar" : "Entrar"}
                  </Button>
                </form>

                <div className="mt-4 text-center space-y-2">
                  {!isRegister && (
                    <button
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-green-700 hover:underline block w-full"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                  {!isAdminLogin && (
                    <button
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-sm text-green-700 hover:underline block w-full"
                    >
                      {isRegister ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsAdminLogin(!isAdminLogin);
                      setIsRegister(false);
                      setIsForgotPassword(false);
                    }}
                    className="text-xs text-muted-foreground hover:underline block w-full"
                  >
                    {isAdminLogin ? "Login como responsável" : "Acesso administrativo"}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventosLogin;
