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
  registerWithCpf: (cpf: string, password: string) => Promise<{ error: any; needsConfirmation?: boolean }>;
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
      async (_event, session) => {
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
    const { data, error } = await supabase
      .from("alunos_26")
      .select("cpf_pai, cpf_mae, email_pai, email_mae, nome_pai, nome_mae")
      .or(`cpf_pai.eq.${cpfClean},cpf_mae.eq.${cpfClean}`)
      .limit(1);

    if (error || !data || data.length === 0) {
      // Try with formatted CPF patterns
      const { data: data2 } = await supabase
        .from("alunos_26")
        .select("cpf_pai, cpf_mae, email_pai, email_mae, nome_pai, nome_mae")
        .or(`cpf_pai.ilike.%${cpfClean}%,cpf_mae.ilike.%${cpfClean}%`)
        .limit(1);

      if (!data2 || data2.length === 0) return { email: null, nome: null };
      const row = data2[0];
      const cpfPaiClean = (row.cpf_pai || "").replace(/\D/g, "");
      const cpfMaeClean = (row.cpf_mae || "").replace(/\D/g, "");
      if (cpfPaiClean === cpfClean) return { email: row.email_pai, nome: row.nome_pai };
      if (cpfMaeClean === cpfClean) return { email: row.email_mae, nome: row.nome_mae };
      return { email: null, nome: null };
    }

    const row = data[0];
    const cpfPaiClean = (row.cpf_pai || "").replace(/\D/g, "");
    const cpfMaeClean = (row.cpf_mae || "").replace(/\D/g, "");
    if (cpfPaiClean === cpfClean) return { email: row.email_pai, nome: row.nome_pai };
    if (cpfMaeClean === cpfClean) return { email: row.email_mae, nome: row.nome_mae };
    return { email: null, nome: null };
  };

  const loginWithCpf = async (cpf: string, password: string) => {
    const { email } = await findEmailByCpf(cpf);
    if (!email) return { error: { message: "CPF não encontrado na base de alunos." } };
    return signIn(email, password);
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
    return { error: null, needsConfirmation: true };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut, loginWithCpf, registerWithCpf }}>
      {children}
    </AuthContext.Provider>
  );
};
