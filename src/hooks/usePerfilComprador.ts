import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type TipoComprador = "aluno" | "externo";

/**
 * Responsável de aluno ou comprador externo, decidido no banco (perfil_comprador): CPF de pai/mãe no
 * cadastro de alunos vale mais que um cadastro de externo feito por engano. cpfResponsavel é o CPF a usar
 * para listar os filhos.
 */
export const usePerfilComprador = (user: User | null) => {
  const [tipo, setTipo] = useState<TipoComprador | null>(null);
  const [cpfResponsavel, setCpfResponsavel] = useState<string | null>(null);

  useEffect(() => {
    let atual = true;
    if (!user) {
      setTipo(null);
      setCpfResponsavel(null);
      return;
    }
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("perfil_comprador" as any);
      if (!atual) return;
      if (error) {
        // Sem a resposta do banco, mantém a regra antiga: cadastro de externo = externo
        const { data: ext } = await supabase.from("compradores_externos").select("id").eq("user_id", user.id).maybeSingle();
        if (!atual) return;
        setTipo(ext ? "externo" : "aluno");
        return;
      }
      const perfil = data as { tipo: string | null; cpf_responsavel: string | null } | null;
      setTipo(perfil?.tipo === "externo" ? "externo" : "aluno");
      setCpfResponsavel(perfil?.cpf_responsavel ?? null);
    })();
    return () => {
      atual = false;
    };
  }, [user]);

  return { tipo, cpfResponsavel };
};
