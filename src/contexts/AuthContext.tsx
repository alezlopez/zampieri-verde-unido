import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { allowedSetores, createPermissionRequestGuard, SETORES, type Setor } from "@/lib/auth-permissions";

export { SETORES, type Setor } from "@/lib/auth-permissions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isConferente: boolean;
  canScan: boolean;
  setores: Setor[];
  podeAcessar: (setor: Setor) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loginWithCpf: (cpf: string, password: string) => Promise<{ error: any }>;
  registerWithCpf: (cpf: string, password: string) => Promise<{ error: any; needsConfirmation?: boolean; email?: string }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConferente, setIsConferente] = useState(false);
  const [setores, setSetores] = useState<Setor[]>([]);

  const limparPerfis = () => {
    setIsAdmin(false);
    setIsConferente(false);
    setSetores([]);
  };

  const checkRoles = async (userId: string, isCurrent: () => boolean) => {
    try {
      const [adminRes, confRes, ...setorRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "conferente" as any }),
        ...SETORES.map((s) =>
          supabase.rpc("has_setor" as any, { _user_id: userId, _setor: s })
        ),
      ]);
      if (!isCurrent()) return;
      setIsAdmin(adminRes.data === true && !adminRes.error);
      setIsConferente(confRes.data === true && !confRes.error);
      setSetores(allowedSetores(setorRes));
    } catch {
      if (isCurrent()) limparPerfis();
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };




  useEffect(() => {
    const requests = createPermissionRequestGuard();
    let authEventReceived = false;
    const applySession = (nextSession: Session | null) => {
      const isCurrent = requests.begin();
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setLoading(true);
        // Supabase calls must run outside the auth callback's lock.
        setTimeout(() => {
          if (isCurrent()) void checkRoles(nextSession.user.id, isCurrent);
        }, 0);
      } else {
        limparPerfis();
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authEventReceived = true;
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing stale session');
          applySession(null);
          setTimeout(() => void supabase.auth.signOut(), 0);
          return;
        }
        applySession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventReceived) applySession(session);
    });

    return () => {
      authEventReceived = true;
      requests.invalidate();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    limparPerfis();
  };

  const cleanCpf = (cpf: string) => cpf.replace(/\D/g, "");


  const findEmailByCpf = async (cpf: string): Promise<{ email: string | null; nome: string | null }> => {
    const cpfClean = cleanCpf(cpf);

    const { data, error } = await supabase.rpc("find_email_by_cpf", {
      p_cpf: cpfClean,
    });

    if (!error && data && data.length > 0) {
      return { email: data[0].email, nome: data[0].nome };
    }

    if (error) {
      console.error("find_email_by_cpf RPC error:", error.message);
      // Retry once after clearing potentially stale session
      await supabase.auth.signOut();
      const { data: retryData, error: retryError } = await supabase.rpc("find_email_by_cpf", {
        p_cpf: cpfClean,
      });
      if (retryError) {
        console.error("find_email_by_cpf retry failed:", retryError.message);
      }
      if (!retryError && retryData && retryData.length > 0) {
        return { email: retryData[0].email, nome: retryData[0].nome };
      }
    }

    return { email: null, nome: null };
  };

  const loginWithCpf = async (cpf: string, password: string) => {
    const { email, nome } = await findEmailByCpf(cpf);
    if (!email) return { error: { message: "CPF não encontrado na base de alunos." } };
    const result = await signIn(email, password);
    if (!result.error) {
      // Store CPF in user metadata so EventoCompra can use it
      await supabase.auth.updateUser({
        data: { cpf: cleanCpf(cpf), nome: nome || undefined },
      });
    }
    return result;
  };

  const registerWithCpf = async (cpf: string, password: string) => {
    const { email, nome } = await findEmailByCpf(cpf);
    if (!email) return { error: { message: "CPF não encontrado na base de alunos. Verifique se o CPF está cadastrado na escola." } };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome, cpf: cleanCpf(cpf) },
      },
    });

    if (error) return { error };
    return { error: null, needsConfirmation: true, email };
  };

  const podeAcessar = (setor: Setor) => isAdmin || setores.includes(setor);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isConferente, canScan: isAdmin || isConferente || setores.includes("portaria"), setores, podeAcessar, signIn, signUp, signOut, loginWithCpf, registerWithCpf }}>

      {children}
    </AuthContext.Provider>
  );
};
