// Admin: liga/desliga a isenção do valor de rematrícula 2027.
// Quando liga a isenção e o contrato já está assinado, conclui a rematrícula na hora.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { concluirRematriculaIsenta } from "../_shared/rematricula-isencao.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");

    const userClient = createClient(supaUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supaUrl, service);
    const { data: permitido } = await admin.rpc("has_setor", {
      _user_id: userData.user.id,
      _setor: "rematricula",
    });
    if (!permitido) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const idAluno = Number(body.id_aluno);
    const isento = body.isento === true;
    if (!Number.isFinite(idAluno) || idAluno <= 0) return json({ error: "invalid_input" }, 400);

    const { data, error } = await userClient.rpc("rematricula_2027_admin_isentar", {
      p_id_aluno: idAluno,
      p_isento: isento,
    });
    const res = (data as { ok: boolean; mensagem: string }[] | null)?.[0];
    if (error || !res?.ok) {
      return json({ ok: false, mensagem: res?.mensagem || "Não foi possível alterar a isenção." }, 400);
    }

    let concluida = false;
    if (isento) {
      const r = await concluirRematriculaIsenta(admin, idAluno);
      concluida = !!(r as { concluida?: boolean }).concluida;
    }

    return json({ ok: true, mensagem: res.mensagem, concluida });
  } catch (e) {
    console.error("rematricula-2027-isentar", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
