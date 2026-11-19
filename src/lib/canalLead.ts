/**
 * De onde a família veio, a partir das etiquetas (UTM) e dos identificadores de clique.
 * Mesma regra em supabase/functions/_shared/aviso-agenda.ts (aviso interno por e-mail).
 */
export interface OrigemLead {
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  gclid?: string | null;
}

export const canal = (l: OrigemLead) => {
  const fonte = (l.utm_source || "").toLowerCase();
  const meio = (l.utm_medium || "").toLowerCase();
  const meta = /^(fb|facebook|ig|instagram|meta)/.test(fonte);
  const google = /google/.test(fonte);
  // Links do atendimento (secretaria, WhatsZampieri) e das automações de WhatsApp
  if (fonte === "whatsapp") {
    return meio === "automacao" ? "WhatsApp (automação)" : meio ? "WhatsApp (atendimento)" : "WhatsApp";
  }
  // UTM explícita de tráfego orgânico vale mais que o fbclid que o Instagram/Facebook anexam a qualquer link
  if (/^(bio|organic|organico|social|post|stories|story|reels|perfil|link_?in_?bio)/.test(meio)) {
    return `Orgânico: ${l.utm_source || "sem fonte"} (${l.utm_medium})`;
  }
  if (/^(cpc|ppc|cpm|paid|pago|ads?|anuncio|display)/.test(meio)) {
    return meta ? "Anúncio Meta" : google ? "Anúncio Google" : `Anúncio (${l.utm_source || "sem fonte"})`;
  }
  // Sem utm_medium: links de anúncio antigos e cliques com fbclid/gclid
  if (l.fbclid || l.fbc || meta) return "Anúncio Meta";
  if (l.gclid || google) return "Anúncio Google";
  if (fonte) return `Campanha (${l.utm_source})`;
  return "Sem origem registrada";
};

export const ehAnuncio = (l: OrigemLead) => canal(l).startsWith("Anúncio");
