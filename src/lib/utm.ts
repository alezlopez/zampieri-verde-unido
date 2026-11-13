// Origem de campanha (UTMs) da visita. O anúncio costuma levar a uma página de entrada
// (ex.: /informativomatricula?utm_source=...) e a pessoa só depois chega ao formulário,
// então as UTMs são guardadas na chegada e lidas no envio da pré-matrícula.

const CHAVE = "zampieri_utm";
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
const CAMPOS = ["utm_source", "utm_campaign", "utm_content"] as const;

export type Utms = Partial<Record<(typeof CAMPOS)[number], string>>;

/** Guarda as UTMs do endereço atual, se houver. A última campanha que trouxe a pessoa prevalece. */
export const capturarUtms = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utms: Utms = {};
    for (const c of CAMPOS) {
      const v = params.get(c)?.trim();
      if (v) utms[c] = v.slice(0, 200);
    }
    if (Object.keys(utms).length === 0) return;
    localStorage.setItem(CHAVE, JSON.stringify({ ...utms, capturado_em: Date.now() }));
  } catch {
    // Navegador sem armazenamento (modo privado, bloqueio): segue sem origem
  }
};

/** UTMs guardadas nos últimos 30 dias, ou vazio. */
export const utmsGuardadas = (): Utms => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null") as (Utms & { capturado_em?: number }) | null;
    if (!salvo?.capturado_em || Date.now() - salvo.capturado_em > VALIDADE_MS) return {};
    const utms: Utms = {};
    for (const c of CAMPOS) if (salvo[c]) utms[c] = salvo[c];
    return utms;
  } catch {
    return {};
  }
};
