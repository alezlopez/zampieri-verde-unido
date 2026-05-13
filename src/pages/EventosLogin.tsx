import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, MailWarning } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";
import { validatePasswordStrength, translatePasswordError, PASSWORD_REQUIREMENTS_TEXT } from "@/lib/passwordValidation";

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
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Cadastro externo (não-aluno)
  const [showExternoForm, setShowExternoForm] = useState(false);
  const [externoNome, setExternoNome] = useState("");
  const [externoEmail, setExternoEmail] = useState("");
  const [externoCelular, setExternoCelular] = useState("");
  const [externoNascimento, setExternoNascimento] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const clearUnconfirmed = () => setUnconfirmedEmail(null);

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
    if (unconfirmedEmail) clearUnconfirmed();
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail || resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (msg.includes("already confirmed")) {
          toast({ title: "Conta já confirmada", description: "Você já pode fazer login normalmente." });
          clearUnconfirmed();
        } else if (msg.includes("rate") || msg.includes("seconds")) {
          toast({ title: "Aguarde um momento", description: "Tente reenviar em alguns instantes.", variant: "destructive" });
          setResendCooldown(60);
        } else {
          toast({ title: "Erro ao reenviar", description: error.message, variant: "destructive" });
        }
      } else {
        toast({
          title: "Link reenviado!",
          description: `Verifique sua caixa de entrada e a pasta de spam em ${maskEmail(unconfirmedEmail)}.`,
        });
        setResendCooldown(60);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível reenviar agora.", variant: "destructive" });
    } finally {
      setResending(false);
    }
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
    clearUnconfirmed();

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
        const pwErr = validatePasswordStrength(password);
        if (pwErr) {
          toast({ title: "Senha inválida", description: `${pwErr} ${PASSWORD_REQUIREMENTS_TEXT}`, variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error, needsConfirmation, email } = await registerWithCpf(cpf, password);
        if (error) {
          const msg = error.message?.toLowerCase() || "";
          const friendlyPw = translatePasswordError(error.message);
          if (friendlyPw) {
            toast({ title: "Senha não atende aos requisitos", description: friendlyPw, variant: "destructive" });
          } else if (msg.includes("não encontrado") || msg.includes("nao encontrado")) {
            // CPF não está em alunos_26 → oferece cadastro externo
            setShowExternoForm(true);
            toast({
              title: "CPF não encontrado entre alunos",
              description: "Crie uma conta como comprador externo para participar dos eventos abertos ao público.",
            });
          } else if (msg.includes("already registered") || msg.includes("user already") || msg.includes("já cadastrado")) {
            const { data } = await supabase.rpc("find_email_by_cpf", { p_cpf: cpf.replace(/\D/g, "") });
            if (data && data.length > 0) {
              setUnconfirmedEmail(data[0].email);
            } else {
              toast({ title: "Conta já existe", description: "Faça login ou recupere sua senha.", variant: "destructive" });
            }
          } else {
            toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
          }
        } else if (needsConfirmation) {
          const masked = email ? maskEmail(email) : "seu e-mail";
          toast({
            title: "Cadastro realizado!",
            description: `Link de confirmação enviado para ${masked}. Verifique sua caixa de entrada.`,
          });
          if (email) setUnconfirmedEmail(email);
        }
      } else {
        const { error } = await loginWithCpf(cpf, password);
        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed") || msg.includes("not confirmed")) {
            const { data } = await supabase.rpc("find_email_by_cpf", { p_cpf: cpf.replace(/\D/g, "") });
            if (data && data.length > 0) {
              setUnconfirmedEmail(data[0].email);
            } else {
              toast({ title: "E-mail não confirmado", description: "Confirme seu cadastro pelo link enviado por e-mail.", variant: "destructive" });
            }
          } else if (msg.includes("não encontrado") || msg.includes("nao encontrado")) {
            // Tentar como comprador externo
            const { data: ctx } = await supabase.rpc("find_user_context_by_cpf", { p_cpf: cpf.replace(/\D/g, "") });
            const ctxRow = ctx?.[0];
            if (ctxRow?.origem === "externo" && ctxRow.email) {
              const r = await signIn(ctxRow.email, password);
              if (r.error) {
                toast({ title: "Erro no login", description: r.error.message, variant: "destructive" });
              } else {
                toast({ title: "Login realizado!" });
                navigate("/eventos");
              }
            } else {
              setShowExternoForm(true);
              toast({
                title: "CPF não cadastrado",
                description: "Crie uma conta como comprador externo abaixo.",
              });
            }
          } else {
            toast({ title: "Erro no login", description: error.message, variant: "destructive" });
          }
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

  const handleExternoSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !password || !externoNome.trim() || !externoEmail.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comprador-externo-signup", {
        body: {
          cpf: cpf.replace(/\D/g, ""),
          nome: externoNome.trim(),
          email: externoEmail.trim().toLowerCase(),
          celular: externoCelular,
          data_nascimento: externoNascimento || undefined,
          password,
        },
      });
      if (error || (data && (data as any).error)) {
        const msg = (data as any)?.error || error?.message || "Falha ao criar conta";
        toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
        return;
      }
      // Login automático
      const r = await signIn(externoEmail.trim().toLowerCase(), password);
      if (r.error) {
        toast({ title: "Conta criada", description: "Faça login para continuar." });
        setShowExternoForm(false);
      } else {
        toast({ title: "Bem-vindo!", description: "Conta criada e logada com sucesso." });
        navigate("/eventos");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha inesperada", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Acesso ao portal de eventos" />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/eventos" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para eventos
          </Link>

          <Card className="border-border shadow-lg">
            <CardHeader className="text-center border-b border-zampieri-gold/30 pb-6">
              <CardTitle className="font-serif text-2xl text-zampieri-green-dark">
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
            <CardContent className="pt-6">
              {!isForgotPassword && !isAdminLogin && (
                <div className="mb-4 p-3 bg-zampieri-cream border border-zampieri-gold/40 rounded-lg text-sm text-zampieri-green-dark">
                  Utilize o mesmo login do portal do aluno. Caso não tenha cadastro,{" "}
                  <button
                    type="button"
                    onClick={() => setIsRegister(true)}
                    className="font-semibold underline hover:text-zampieri-gold"
                  >
                    cadastre sua senha clicando aqui
                  </button>.
                </div>
              )}
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

                  <Button type="submit" className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white" disabled={loading}>
                    {loading ? "Aguarde..." : "Enviar link de redefinição"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="text-sm text-zampieri-green-dark hover:text-zampieri-gold hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {unconfirmedEmail && !isAdminLogin && (
                    <div className="mb-4 p-4 bg-zampieri-cream border border-zampieri-gold rounded-lg">
                      <div className="flex items-start gap-3">
                        <MailWarning className="w-5 h-5 text-zampieri-gold mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zampieri-green-dark">
                            Confirme seu cadastro
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enviamos um link de confirmação para <strong>{maskEmail(unconfirmedEmail)}</strong>.
                            Verifique sua caixa de entrada e a pasta de spam. Se não recebeu, reenvie abaixo.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleResendConfirmation}
                            disabled={resending || resendCooldown > 0}
                            className="mt-3 bg-zampieri-gold hover:bg-zampieri-gold-light text-zampieri-green-dark"
                          >
                            {resending
                              ? "Enviando..."
                              : resendCooldown > 0
                              ? `Reenviar em ${resendCooldown}s`
                              : "Reenviar link de confirmação"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
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

                    <Button type="submit" className="w-full bg-zampieri-green-dark hover:bg-zampieri-green text-white" disabled={loading}>
                      {loading ? "Aguarde..." : isAdminLogin ? "Entrar" : isRegister ? "Cadastrar" : "Entrar"}
                    </Button>
                  </form>

                  {showExternoForm && !isAdminLogin && (
                    <div className="mt-6 p-4 border border-zampieri-gold/40 bg-zampieri-cream rounded-lg">
                      <p className="text-sm font-semibold text-zampieri-green-dark mb-2">
                        Cadastro de comprador externo
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Não é aluno? Crie sua conta para comprar ingressos de eventos abertos ao público. Usaremos o CPF e a senha já digitados acima.
                      </p>
                      <form onSubmit={handleExternoSignup} className="space-y-3">
                        <Input placeholder="Nome completo *" value={externoNome} onChange={(e) => setExternoNome(e.target.value)} required />
                        <Input type="email" placeholder="E-mail *" value={externoEmail} onChange={(e) => setExternoEmail(e.target.value)} required />
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Celular" value={externoCelular} onChange={(e) => setExternoCelular(e.target.value)} />
                          <Input type="date" placeholder="Nascimento" value={externoNascimento} onChange={(e) => setExternoNascimento(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={loading} className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                            {loading ? "Criando..." : "Criar conta e entrar"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowExternoForm(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="mt-4 text-center space-y-2">
                    {!isRegister && (
                      <button
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-zampieri-green-dark hover:text-zampieri-gold hover:underline block w-full"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                    {!isAdminLogin && (
                      <button
                        onClick={() => { setIsRegister(!isRegister); clearUnconfirmed(); }}
                        className="text-sm text-zampieri-green-dark hover:text-zampieri-gold hover:underline block w-full"
                      >
                        {isRegister ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsAdminLogin(!isAdminLogin);
                        setIsRegister(false);
                        setIsForgotPassword(false);
                        clearUnconfirmed();
                      }}
                      className="text-xs text-muted-foreground hover:text-zampieri-green-dark hover:underline block w-full"
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

      <Footer />
    </div>
  );
};

export default EventosLogin;
