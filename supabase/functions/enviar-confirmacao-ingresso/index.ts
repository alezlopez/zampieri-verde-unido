import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Colégio Zampieri <eventos@colegiozampieri.com.br>";
const ORG = "Colégio Zampieri";
const LINK_INGRESSOS = "https://colegiozampieri.com.br/eventos/meus-ingressos";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      .select("id, nome_comprador, nome_participante, email_participante, tipo_ingresso, categoria_meia, valor_total, status, email_confirmacao_enviado_em, evento_id, user_id, eventos(titulo, data_evento, horario, local)");
    q = payment_id ? q.eq("asaas_payment_id", payment_id) : q.eq("id", ingresso_id);

    const { data: ingressos, error } = await q;
    if (error) throw error;
    if (!ingressos?.length) return new Response(JSON.stringify({ ok: true, skipped: "no_ingressos" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
      const dataFmt = new Date(evento.data_evento + "T00:00:00").toLocaleDateString("pt-BR");
      const temMeia = lista.some((i: any) => i.tipo_ingresso === "meia");
      const totalPago = lista.reduce((s: number, i: any) => s + (Number(i.valor_total) || 0), 0);
      const nomeComprador = primeiro.nome_comprador || primeiro.nome_participante || "participante";

      const linhas = lista.map((i: any) => {
        const tipo = i.tipo_ingresso === "meia"
          ? `Meia${i.categoria_meia ? ` (${i.categoria_meia})` : ""}`
          : "Inteira";
        return `
          <tr style="background:#ffffff;">
            <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;color:#1a1a1a;">${i.nome_participante || i.nome_comprador || "—"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;">
              <span style="background:#e8f5e9;color:#1b5e20;font-size:12px;padding:2px 8px;border-radius:12px;">${tipo}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;text-align:right;font-weight:bold;color:#1a1a1a;">${fmtBRL(Number(i.valor_total) || 0)}</td>
          </tr>`;
      }).join("");

      const avisoMeia = temMeia ? `
        <tr>
          <td style="background:#ffffff;padding:0 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
              <tr><td style="padding:12px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:28px;vertical-align:top;font-size:18px;">&#9888;&#65039;</td>
                  <td style="padding-left:10px;">
                    <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#92400e;font-family:Arial,sans-serif;">Atenção — meia-entrada</p>
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;font-family:Arial,sans-serif;">Participantes com meia-entrada devem apresentar o <strong>documento comprobatório original</strong> na portaria. Sem o documento, será cobrada a diferença para o inteiro.</p>
                  </td>
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>` : "";

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Confirmação de Ingresso — ${evento.titulo}</title></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:32px 16px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-radius:10px;overflow:hidden;border:1px solid #d6cfc4;">
  <tr><td style="background:#0b3d2e;padding:28px 32px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:50px;padding:5px 18px;margin-bottom:16px;">
      <span style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;font-family:Arial,sans-serif;text-transform:uppercase;">${ORG}</span>
    </div>
    <div style="margin-bottom:6px;"><span style="font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;font-family:Georgia,serif;">${evento.titulo}</span></div>
    <div style="margin-top:14px;display:inline-block;background:#1a6644;border-radius:6px;padding:10px 20px;">
      <span style="font-size:13px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;display:block;margin-bottom:2px;letter-spacing:1px;text-transform:uppercase;">Pagamento confirmado</span>
      <span style="font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003; Ingresso garantido!</span>
    </div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:28px 32px 0;">
    <p style="margin:0 0 6px;font-size:17px;color:#1a1a1a;font-family:Arial,sans-serif;">Olá, <strong>${nomeComprador}</strong>! 👋</p>
    <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;font-family:Arial,sans-serif;">Seu pagamento foi processado com sucesso. Guarde este e-mail — ele é o seu comprovante de inscrição no evento!</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;border-radius:8px;border-left:4px solid #0b3d2e;"><tr><td style="padding:18px 20px;">
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;color:#888888;text-transform:uppercase;font-family:Arial,sans-serif;">Detalhes do evento</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:5px 0;color:#888888;font-size:14px;font-family:Arial,sans-serif;width:90px;">&#128197; Data</td><td style="padding:5px 0;color:#1a1a1a;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;">${dataFmt}</td></tr>
        ${evento.horario ? `<tr><td style="padding:5px 0;color:#888888;font-size:14px;font-family:Arial,sans-serif;">&#128336; Horário</td><td style="padding:5px 0;color:#1a1a1a;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;">${evento.horario}</td></tr>` : ""}
        ${evento.local ? `<tr><td style="padding:5px 0;color:#888888;font-size:14px;font-family:Arial,sans-serif;vertical-align:top;">&#128205; Local</td><td style="padding:5px 0;color:#1a1a1a;font-size:14px;font-family:Arial,sans-serif;"><strong>${evento.local}</strong></td></tr>` : ""}
      </table>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:0 32px 20px;">
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#888888;text-transform:uppercase;font-family:Arial,sans-serif;">Seus ingressos</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;border-collapse:collapse;">
      <thead><tr style="background:#0b3d2e;">
        <th style="padding:10px 12px;text-align:left;color:#ffffff;font-weight:600;font-size:12px;">Participante</th>
        <th style="padding:10px 12px;text-align:left;color:#ffffff;font-weight:600;font-size:12px;">Tipo</th>
        <th style="padding:10px 12px;text-align:right;color:#ffffff;font-weight:600;font-size:12px;">Valor</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:12px 12px 0;font-size:13px;color:#888888;font-family:Arial,sans-serif;">Total pago</td>
        <td style="padding:12px 12px 0;text-align:right;font-size:18px;font-weight:700;color:#0b3d2e;font-family:Arial,sans-serif;">${fmtBRL(totalPago)}</td>
      </tr></tfoot>
    </table>
  </td></tr>
  ${avisoMeia}
  <tr><td style="background:#ffffff;padding:0 32px 28px;text-align:center;">
    <a href="${LINK_INGRESSOS}" style="display:inline-block;background:#0b3d2e;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.3px;">Ver QR Code dos ingressos</a>
    <p style="margin:14px 0 0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">Apresente o QR Code na entrada. Ingressos intransferíveis.</p>
  </td></tr>
  <tr><td style="background:#0b3d2e;padding:20px 32px;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;">${ORG} &middot; ${evento.titulo}</p>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);font-family:Arial,sans-serif;">Dúvidas? Entre em contato com a secretaria do colégio.</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;

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
