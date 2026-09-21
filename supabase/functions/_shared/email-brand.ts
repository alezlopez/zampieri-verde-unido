/**
 * Identidade visual do Colégio Zampieri aplicada aos e-mails (Resend).
 * Manual de identidade visual 2026.
 */

export const MARCA = {
  verdeEscuro: "#0F3D24",
  verdeMedio: "#1A5C38",
  verdeClaro: "#2D7A4E",
  vinho: "#8B1A1A",
  dourado: "#B8860B",
  douradoClaro: "#D4A017",
  creme: "#F5F0E8",
  brancoQuente: "#FAF8F4",
  texto: "#33372F",
  textoSuave: "#6B7166",
  borda: "#E3DCCF",
} as const;

export const LOGO_URL =
  "https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/fotos/Logotipo.png";

export const SITE_URL = "https://colegiozampieri.com.br";
export const WHATSAPP_PADRAO = "5511939341503";

const TITULO_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";
const CORPO_FONT = "'Lato', Arial, Helvetica, sans-serif";

/** Faixa tricolor (verde · branco · vermelho) usada como assinatura da marca. */
const tricolor = `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
    <td height="4" style="background:${MARCA.verdeMedio};font-size:0;line-height:0">&nbsp;</td>
    <td height="4" style="background:#FFFFFF;font-size:0;line-height:0">&nbsp;</td>
    <td height="4" style="background:${MARCA.vinho};font-size:0;line-height:0">&nbsp;</td>
  </tr></table>`;

export const paragrafo = (t: string) =>
  `<p style="margin:0 0 14px;font-family:${CORPO_FONT};font-size:16px;font-weight:300;line-height:1.7;color:${MARCA.texto}">${t}</p>`;

export const botao = (href: string, texto: string) => `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0"><tr>
    <td style="background:${MARCA.verdeMedio};border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${CORPO_FONT};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;text-decoration:none">${texto}</a>
    </td>
  </tr></table>`;

export const destaque = (conteudo: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${MARCA.creme};border-left:4px solid ${MARCA.dourado};border-radius:8px;margin:0 0 18px">
    <tr><td style="padding:18px 20px;font-family:${CORPO_FONT};font-size:15px;line-height:1.7;color:${MARCA.texto}">${conteudo}</td></tr>
  </table>`;

export const codigo = (valor: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${MARCA.creme};border:1px solid ${MARCA.borda};border-radius:12px;margin:8px 0 18px">
    <tr><td align="center" style="padding:22px">
      <div style="font-family:${CORPO_FONT};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${MARCA.textoSuave};margin-bottom:10px">Seu código</div>
      <div style="font-family:${CORPO_FONT};font-size:34px;font-weight:700;letter-spacing:10px;color:${MARCA.verdeEscuro}">${valor}</div>
    </td></tr>
  </table>`;

export interface LayoutOpts {
  titulo: string;
  corpo: string;
  /** Label pequeno acima do título (ex.: "PRÉ-MATRÍCULA"). */
  etiqueta?: string;
  /** Texto do rodapé antes dos dados fixos. */
  rodape?: string;
  whatsapp?: string;
  largura?: number;
}

/** Envolve o conteúdo no layout oficial da marca. */
export function emailLayout(
  { titulo, corpo, etiqueta, rodape, whatsapp = WHATSAPP_PADRAO, largura = 600 }: LayoutOpts,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${MARCA.brancoQuente}">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${MARCA.brancoQuente};padding:28px 14px">
<tr><td align="center">
  <table width="${largura}" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:${largura}px;background:#FFFFFF;border:1px solid ${MARCA.borda};border-radius:14px;overflow:hidden">
    <tr><td>${tricolor}</td></tr>
    <tr><td align="center" style="background:${MARCA.verdeEscuro};padding:28px 24px">
      <img src="${LOGO_URL}" alt="Colégio Zampieri" width="78" style="display:block;border:0;margin:0 auto 14px;height:auto">
      <div style="font-family:${CORPO_FONT};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${MARCA.douradoClaro}">Tradição em Educação · Desde 1980</div>
    </td></tr>
    <tr><td style="padding:30px 32px 8px">
      ${
    etiqueta
      ? `<div style="font-family:${CORPO_FONT};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${MARCA.dourado};margin-bottom:8px">${etiqueta}</div>`
      : ""
  }
      <h1 style="margin:0 0 18px;font-family:${TITULO_FONT};font-size:28px;font-weight:700;line-height:1.25;color:${MARCA.verdeEscuro}">${titulo}</h1>
    </td></tr>
    <tr><td style="padding:0 32px 26px">${corpo}</td></tr>
    <tr><td>${tricolor}</td></tr>
    <tr><td style="background:${MARCA.verdeEscuro};padding:22px 32px;text-align:center">
      ${
    rodape
      ? `<p style="margin:0 0 10px;font-family:${CORPO_FONT};font-size:13px;line-height:1.6;color:rgba(255,255,255,0.75)">${rodape}</p>`
      : ""
  }
      <p style="margin:0 0 6px;font-family:${CORPO_FONT};font-size:13px;color:rgba(255,255,255,0.75)">
        Dúvidas? <a href="https://wa.me/${whatsapp}" style="color:${MARCA.douradoClaro};text-decoration:none">Fale com a gente no WhatsApp</a>
      </p>
      <p style="margin:0;font-family:${CORPO_FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">
        <a href="${SITE_URL}" style="color:rgba(255,255,255,0.45);text-decoration:none">colegiozampieri.com.br</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
