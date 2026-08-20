import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notificacao {
  id: string;
  setor: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  link: string | null;
  ref_id: string | null;
  created_at: string;
  lida: boolean;
}

const LIMITE = 50;

export const useNotificacoes = () => {
  const { user, isAdmin, setores, loading: authLoading } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const ativo = !!user && (isAdmin || setores.length > 0);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: notifs }, { data: lidas }] = await Promise.all([
      supabase
        .from("admin_notificacoes" as any)
        .select("id, setor, tipo, titulo, descricao, link, ref_id, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMITE),
      supabase
        .from("admin_notificacoes_lidas" as any)
        .select("notificacao_id")
        .eq("user_id", user.id),
    ]);

    const lidasSet = new Set(((lidas as any[]) ?? []).map((l) => l.notificacao_id));
    setNotificacoes(
      ((notifs as any[]) ?? []).map((n) => ({ ...n, lida: lidasSet.has(n.id) })) as Notificacao[]
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!ativo) {
      setNotificacoes([]);
      setLoading(false);
      return;
    }
    carregar();
  }, [authLoading, ativo, carregar]);

  useEffect(() => {
    if (!ativo) return;
    const channel = supabase
      .channel("admin-notificacoes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notificacoes" },
        (payload) => {
          const n = payload.new as any;
          if (!isAdmin && !setores.includes(n.setor)) return;
          setNotificacoes((prev) =>
            prev.some((p) => p.id === n.id)
              ? prev
              : [{ ...n, lida: false } as Notificacao, ...prev].slice(0, LIMITE)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ativo, isAdmin, setores]);

  const marcarLida = useCallback(
    async (id: string) => {
      if (!user) return;
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
      await supabase
        .from("admin_notificacoes_lidas" as any)
        .upsert({ notificacao_id: id, user_id: user.id } as any, {
          onConflict: "notificacao_id,user_id",
        });
    },
    [user]
  );

  const marcarTodasLidas = useCallback(async () => {
    if (!user) return;
    const pendentes = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (!pendentes.length) return;
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase.from("admin_notificacoes_lidas" as any).upsert(
      pendentes.map((id) => ({ notificacao_id: id, user_id: user.id })) as any,
      { onConflict: "notificacao_id,user_id" }
    );
  }, [user, notificacoes]);

  return {
    notificacoes,
    naoLidas: notificacoes.filter((n) => !n.lida).length,
    loading,
    ativo,
    recarregar: carregar,
    marcarLida,
    marcarTodasLidas,
  };
};

export default useNotificacoes;
