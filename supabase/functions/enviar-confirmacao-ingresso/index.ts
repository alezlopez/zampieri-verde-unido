import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Colégio Zampieri <eventos@colegiozampieri.com.br>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY ausente");

    const { payment_id, ingresso_id } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    let q = admin
      .from("ingressos")
      .select("id, nome_comprador, nome_participante, email_participante, tipo_ingresso, categoria_meia, status, email_confirmacao_enviado_em, evento_id, user_id, eventos(titulo, data_evento, horario, local)");
    q = payment_id ? q.eq("asaas_payment_id", payment_id) : q.eq("id", ingresso_id);

    const { data: ingressos, error } = await q;
    if (error) throw error;
    if (!ingressos?.length) return new Response(JSON.stringify({ ok: true, skipped: "no_ingressos" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolver e-mail por usuário (uma única notificação por comprador, mesmo com múltiplos ingressos)
    const grupos: Record<string, any[]> = {};
    for (const i of ingressos as any[]) {
      if (i.status !== "pago") continue;
      if (i.email_confirmacao_enviado_em) continue;
      grupos[i.user_id] = grupos[i.user_id] || [];
      grupos[i.user_id].push(i);
    }

    const results: any[] = [];
    for (const userId of Object.keys(grupos)) {
      const lista = grupos[userId];
      const primeiro = lista[0];
      let email = primeiro.email_participante;
      if (!email) {
        const { data: comp } = await admin.rpc("get_comprador_dados", { p_user_id: userId });
        email = comp?.[0]?.email;
      }
      if (!email) { results.push({ user_id: userId, skipped: "sem_email" }); continue; }

      const evento = primeiro.eventos;
      const linkBase = "https://colegiozampieri.com.br/eventos/meus-ingressos";
      const dataFmt = new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR");

      const linhas = lista.map((i: any) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${i.nome_participante || i.nome_comprador}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${i.tipo_ingresso === "meia" ? `Meia (${i.categoria_meia ?? "—"})` : "Inteira"}</td>
        </tr>`).join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937;">
          <div style="background:#0b3d2e;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">Pagamento confirmado 🎉</h1>
          </div>
          <div style="padding:20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px;">
            <p>Olá! Recebemos a confirmação do seu pagamento para o evento:</p>
            <h2 style="color:#0b3d2e;margin:16px 0 8px;">${evento.titulo}</h2>
            <p style="margin:4px 0;"><strong>Data:</strong> ${dataFmt}${evento.horario ? ` — ${evento.horario}` : ""}</p>
            ${evento.local ? `<p style="margin:4px 0;"><strong>Local:</strong> ${evento.local}</p>` : ""}
            <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
              <thead><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Participante</th><th style="padding:8px;text-align:left;">Tipo</th></tr></thead>
              <tbody>${linhas}</tbody>
            </table>
            ${lista.some((i: any) => i.tipo_ingresso === "meia") ? `<p style="background:#fef3c7;padding:10px;border-radius:6px;margin-top:16px;font-size:13px;"><strong>Meia-entrada:</strong> apresente o documento original na portaria.</p>` : ""}
            <div style="text-align:center;margin:24px 0;">
              <a href="${linkBase}" style="background:#0b3d2e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Ver meus ingressos</a>
            </div>
            <p style="font-size:12px;color:#6b7280;">Apresente o QR Code do ingresso na entrada do evento.</p>
          </div>
        </div>`;

      const r = await fetch(RESEND_API, {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `✅ Ingresso confirmado — ${evento.titulo}`,
          html,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error("[resend] falha", r.status, body);
        results.push({ user_id: userId, error: body });
        continue;
      }

      await admin
        .from("ingressos")
        .update({ email_confirmacao_enviado_em: new Date().toISOString() })
        .in("id", lista.map((i: any) => i.id));

      results.push({ user_id: userId, sent: true, email_id: body.id });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[enviar-confirmacao-ingresso]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
