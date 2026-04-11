import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loginWithCpf: (cpf: string, password: string) => Promise<{ error: any }>;
  registerWithCpf: (cpf: string, password: string) => Promise<{ error: any; needsConfirmation?: boolean; email?: string }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Fixed admin emails
const ADMIN_EMAILS = [
  "secretaria@colegiozampieri.com.br",
  "diretoria@colegiozampieri.com.br",
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing stale session');
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkAdmin(session.user.id), 0);
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    setIsAdmin(false);
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

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut, loginWithCpf, registerWithCpf }}>
      {children}
    </AuthContext.Provider>
  );
};
