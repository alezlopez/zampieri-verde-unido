import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PAPEIS = [
  "admin",
  "rematricula",
  "matricula",
  "eventos",
  "portaria",
  "produtos",
  "conferente",
] as const;

type Papel = (typeof PAPEIS)[number];

const normalizarPapeis = (v: unknown): Papel[] => {
  if (!Array.isArray(v)) return [];
  const set = new Set<Papel>();
  for (const item of v) {
    const p = String(item);
    if ((PAPEIS as readonly string[]).includes(p)) set.add(p as Papel);
  }
  return [...set];
};

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userRes } = await admin.auth.getUser(jwt);
    const solicitante = userRes?.user;
    if (!solicitante) return json({ error: "nao_autenticado" }, 401);

    const { data: ehAdmin } = await admin.rpc("has_role", {
      _user_id: solicitante.id,
      _role: "admin",
    });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "listar");

    const salvarPapeis = async (userId: string, papeis: Papel[]) => {
      await admin.from("user_roles").delete().eq("user_id", userId);
      if (papeis.length) {
        const { error } = await admin
          .from("user_roles")
          .insert(papeis.map((role) => ({ user_id: userId, role })));
        if (error) throw error;
      }
    };

    if (acao === "listar") {
      const { data: roles, error } = await admin
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;

      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      const usuarios: Record<string, { email: string; criado_em: string }> = {};

      // A API admin não busca por lista de IDs; percorremos as páginas de usuários.
      for (let page = 1; page <= 20; page++) {
        const { data, error: errList } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (errList) throw errList;
        for (const u of data.users) {
          if (ids.includes(u.id)) {
            usuarios[u.id] = { email: u.email ?? "", criado_em: u.created_at };
          }
        }
        if (data.users.length < 200) break;
      }

      const lista = ids.map((id) => ({
        user_id: id,
        email: usuarios[id]?.email ?? "(usuário removido)",
        criado_em: usuarios[id]?.criado_em ?? null,
        papeis: (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role),
      }));
      lista.sort((a, b) => a.email.localeCompare(b.email));

      return json({ ok: true, usuarios: lista, papeis_disponiveis: PAPEIS });
    }

    if (acao === "criar") {
      const email = String(body?.email || "").trim().toLowerCase();
      const senha = String(body?.senha || "");
      const papeis = normalizarPapeis(body?.papeis);

      if (!emailValido(email)) return json({ error: "email_invalido" }, 400);
      if (senha.length < 8) return json({ error: "senha_curta" }, 400);
      if (!papeis.length) return json({ error: "sem_papeis" }, 400);

      const { data: criado, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });

      if (error || !criado?.user) {
        const msg = String(error?.message || "").toLowerCase();
        // Conta já existe (ex.: cadastro de responsável): reaproveita e aplica papéis
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          let existente: { id: string } | null = null;
          for (let page = 1; page <= 20 && !existente; page++) {
            const { data, error: errList } = await admin.auth.admin.listUsers({ page, perPage: 200 });
            if (errList) break;
            const achou = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
            if (achou) existente = { id: achou.id };
            if (data.users.length < 200) break;
          }
          if (!existente) return json({ error: "email_em_uso" }, 400);

          await admin.auth.admin.updateUserById(existente.id, {
            password: senha,
            email_confirm: true,
          });
          await salvarPapeis(existente.id, papeis);
          return json({ ok: true, user_id: existente.id, reaproveitado: true });
        }
        return json({ error: "falha_criar", detalhe: error?.message }, 400);
      }

      await salvarPapeis(criado.user.id, papeis);
      return json({ ok: true, user_id: criado.user.id });

    }

    if (acao === "atualizar_papeis") {
      const userId = String(body?.user_id || "");
      const papeis = normalizarPapeis(body?.papeis);
      if (!userId) return json({ error: "user_id_obrigatorio" }, 400);
      if (userId === solicitante.id && !papeis.includes("admin")) {
        return json({ error: "nao_remova_seu_admin" }, 400);
      }
      await salvarPapeis(userId, papeis);
      return json({ ok: true });
    }

    if (acao === "redefinir_senha") {
      const userId = String(body?.user_id || "");
      const senha = String(body?.senha || "");
      if (!userId) return json({ error: "user_id_obrigatorio" }, 400);
      if (senha.length < 8) return json({ error: "senha_curta" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
      if (error) return json({ error: "falha_senha", detalhe: error.message }, 400);
      return json({ ok: true });
    }

    if (acao === "remover_acesso") {
      const userId = String(body?.user_id || "");
      if (!userId) return json({ error: "user_id_obrigatorio" }, 400);
      if (userId === solicitante.id) return json({ error: "nao_remova_a_si" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId);
      return json({ ok: true });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("admin-usuarios erro:", e);
    return json({ error: "erro_interno", detalhe: String(e) }, 500);
  }
});
