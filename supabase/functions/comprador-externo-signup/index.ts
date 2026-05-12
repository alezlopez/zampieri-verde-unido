import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface Body {
  cpf: string;
  nome: string;
  email: string;
  celular?: string;
  data_nascimento?: string;
  password: string;
}

const cleanCpf = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = (await req.json()) as Body;
    const cpf = cleanCpf(body.cpf);
    const nome = (body.nome || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (cpf.length !== 11 || !nome || !email.includes("@") || password.length < 6) {
      return new Response(JSON.stringify({ error: "Dados inválidos. Verifique CPF, nome, email e senha (mín. 6)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CPF já é aluno?
    const { data: ctx } = await admin.rpc("find_user_context_by_cpf", { p_cpf: cpf });
    if (ctx && ctx[0]?.origem === "aluno") {
      return new Response(JSON.stringify({
        error: "Este CPF está cadastrado como responsável de aluno. Use a opção de login normal.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (ctx && ctx[0]?.origem === "externo") {
      return new Response(JSON.stringify({
        error: "Este CPF já possui cadastro. Faça login ou recupere a senha.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cria user no auth (já confirmado)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, cpf },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message || "";
      if (msg.toLowerCase().includes("already")) {
        return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw createErr || new Error("Falha ao criar usuário");
    }

    // Insere comprador externo
    const { error: insErr } = await admin.from("compradores_externos").insert({
      user_id: created.user.id,
      cpf,
      nome,
      email,
      celular: body.celular?.replace(/\D/g, "") || null,
      data_nascimento: body.data_nascimento || null,
    });

    if (insErr) {
      // rollback
      await admin.auth.admin.deleteUser(created.user.id);
      throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[comprador-externo-signup]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
