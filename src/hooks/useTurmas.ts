import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cache: Promise<string[]> | null = null;

/** Turmas atuais do cadastro de alunos (texto exato de alunos_26.curso). */
export function useTurmas() {
  const [turmas, setTurmas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let vivo = true;
    if (!cache) {
      cache = Promise.resolve(supabase.rpc("listar_turmas"))
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []).filter(Boolean);
        })
        .catch((e) => {
          cache = null;
          console.error("listar_turmas:", e);
          return [];
        });
    }
    cache.then((t) => {
      if (vivo) {
        setTurmas(t);
        setCarregando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);
  return { turmas, carregando };
}
