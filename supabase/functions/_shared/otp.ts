export const corsHeadersOtp = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export const gerarCodigo = () => String(Math.floor(100000 + Math.random() * 900000));

export async function hashCodigo(codigo: string, idAluno: number) {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "sem-pepper";
  const data = new TextEncoder().encode(`${idAluno}:${codigo}:${pepper}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const mascararTelefone = (tel: string) => {
  const d = onlyDigits(tel);
  return `(${d.slice(0, 2)}) •••••-${d.slice(-4)}`;
};

export const mascararEmail = (email: string) => {
  const [u, dom] = (email || "").trim().toLowerCase().split("@");
  if (!dom) return email;
  return `${u.slice(0, 2)}•••@${dom}`;
};

/** Normaliza para o formato E.164 brasileiro exigido pela Cloud API */
export const telefoneE164 = (tel: string) => {
  let d = onlyDigits(tel);
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
};

export async function enviarWhatsappOtp(telefone: string, codigo: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const template = Deno.env.get("WHATSAPP_TEMPLATE_OTP") || "codigo_verificacao";
  const lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "pt_BR";
  const tipo = (Deno.env.get("WHATSAPP_TEMPLATE_TIPO") || "auth").toLowerCase();
  if (!token || !phoneId) throw new Error("WhatsApp Cloud API não configurada");

  const body = { type: "body", parameters: [{ type: "text", text: codigo }] };
  // Templates de autenticação podem ter botão "Copiar código" (copy_code)
  // ou "Preenchimento automático" (url). Tentamos as variantes até uma entregar.
  const variantesBotao: unknown[][] =
    tipo === "auth"
      ? [
          [body, { type: "button", sub_type: "copy_code", index: "0", parameters: [{ type: "coupon_code", coupon_code: codigo }] }],
          [body, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] }],
          [body],
        ]
      : [[body]];

  // Tenta o idioma configurado e, se o template não existir nesse locale, tenta variantes
  const idiomas = [lang, "pt_BR", "pt_PT", "en_US"].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  let ultimoErro = "";
  for (const code of idiomas) {
    for (const components of variantesBotao) {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefoneE164(telefone),
          type: "template",
          template: { name: template, language: { code }, components },
        }),
      });
      const texto = await res.text();
      console.log(
        `WhatsApp OTP -> to=${telefoneE164(telefone)} template=${template} lang=${code} tipo=${tipo} btn=${JSON.stringify((components as any[])[1]?.sub_type ?? "none")} status=${res.status} body=${texto}`,
      );
      if (res.ok) return;
      ultimoErro = `${res.status}:${texto}`;
      // 132001 = template não existe nesse idioma -> troca idioma
      if (texto.includes("132001")) break;
      // demais erros: tenta próxima variante de botão
    }
  }

  console.error(`WhatsApp OTP falhou: ${ultimoErro}`);
  throw new Error(`whatsapp_falhou:${ultimoErro.slice(0, 80)}`);
}


export async function enviarEmailOtp(email: string, codigo: string, nomeAluno: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY ausente");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Colégio Zampieri <eventos@colegiozampieri.com.br>",
      to: [email],
      subject: `Seu código de verificação: ${codigo}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#0F3D24;margin:0 0 8px">Código de verificação</h2>
          <p style="color:#444;font-size:14px;margin:0 0 20px">
            Use o código abaixo para continuar a rematrícula 2027 de <strong>${nomeAluno}</strong>.
          </p>
          <div style="background:#F3F7F2;border:1px solid #D8E4D6;border-radius:12px;padding:20px;text-align:center">
            <span style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#0F3D24">${codigo}</span>
          </div>
          <p style="color:#777;font-size:12px;margin-top:20px">
            O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.
          </p>
        </div>`,
    }),
  });
  const texto = await res.text();
  if (!res.ok) {
    console.error(`Resend OTP falhou [${res.status}]: ${texto}`);
    throw new Error(`email_falhou:${res.status}`);
  }
}
