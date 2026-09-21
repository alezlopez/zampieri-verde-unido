import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { botao, emailLayout, MARCA } from "../_shared/email-brand.ts";

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

      const avisoMeia = temMeia
        ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FDF6E3;border:1px solid ${MARCA.dourado};border-radius:8px;margin:0 0 18px">
             <tr><td style="padding:14px 18px;font-family:Arial,sans-serif">
               <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${MARCA.vinho}">Atenção — meia-entrada</p>
               <p style="margin:0;font-size:13px;line-height:1.6;color:${MARCA.texto}">Participantes com meia-entrada devem apresentar o <strong>documento comprobatório original</strong> na portaria. Sem o documento, será cobrada a diferença para o inteiro.</p>
             </td></tr>
           </table>`
        : "";

      const corpo = `
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${MARCA.verdeMedio};border-radius:8px;margin:0 0 20px">
          <tr><td align="center" style="padding:16px">
            <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75)">Pagamento confirmado</div>
            <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#FFFFFF;margin-top:4px">&#10003; Ingresso garantido!</div>
          </td></tr>
        </table>
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:16px;color:${MARCA.texto}">Olá, <strong>${nomeComprador}</strong>!</p>
        <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:${MARCA.textoSuave}">Seu pagamento foi processado com sucesso. Guarde este e-mail — ele é o seu comprovante de inscrição no evento.</p>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${MARCA.creme};border-left:4px solid ${MARCA.dourado};border-radius:8px;margin:0 0 20px">
          <tr><td style="padding:18px 20px;font-family:Arial,sans-serif">
            <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MARCA.textoSuave}">Detalhes do evento</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:14px;color:${MARCA.textoSuave};width:90px">Data</td><td style="padding:4px 0;font-size:14px;font-weight:bold;color:${MARCA.texto}">${dataFmt}</td></tr>
              ${
        evento.horario
          ? `<tr><td style="padding:4px 0;font-size:14px;color:${MARCA.textoSuave}">Horário</td><td style="padding:4px 0;font-size:14px;font-weight:bold;color:${MARCA.texto}">${evento.horario}</td></tr>`
          : ""
      }
              ${
        evento.local
          ? `<tr><td style="padding:4px 0;font-size:14px;color:${MARCA.textoSuave};vertical-align:top">Local</td><td style="padding:4px 0;font-size:14px;color:${MARCA.texto}"><strong>${evento.local}</strong></td></tr>`
          : ""
      }
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MARCA.textoSuave}">Seus ingressos</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;font-family:Arial,sans-serif;border-collapse:collapse;margin:0 0 18px">
          <thead><tr style="background:${MARCA.verdeEscuro}">
            <th style="padding:10px 12px;text-align:left;color:#ffffff;font-weight:600;font-size:12px;">Participante</th>
            <th style="padding:10px 12px;text-align:left;color:#ffffff;font-weight:600;font-size:12px;">Tipo</th>
            <th style="padding:10px 12px;text-align:right;color:#ffffff;font-weight:600;font-size:12px;">Valor</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr>
            <td colspan="2" style="padding:12px 12px 0;font-size:13px;color:${MARCA.textoSuave}">Total pago</td>
            <td style="padding:12px 12px 0;text-align:right;font-size:18px;font-weight:700;color:${MARCA.verdeEscuro}">${
        fmtBRL(totalPago)
      }</td>
          </tr></tfoot>
        </table>
        ${avisoMeia}
        <div style="text-align:center">${botao(LINK_INGRESSOS, "Ver QR Code dos ingressos")}</div>
        <p style="margin:0;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:${MARCA.textoSuave}">Apresente o QR Code na entrada. Ingressos intransferíveis.</p>`;

      const html = emailLayout({
        etiqueta: "Eventos",
        titulo: evento.titulo,
        corpo,
        rodape: `${ORG} · ${evento.titulo}`,
      });


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
