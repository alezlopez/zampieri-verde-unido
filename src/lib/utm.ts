// Origem de campanha da visita. O anúncio costuma levar a uma página de entrada
// (ex.: /informativomatricula?utm_source=...) e a pessoa só depois envia um formulário,
// então a origem é guardada na chegada e lida no envio.
// fbclid/gclid identificam clique em anúncio do Meta/Google mesmo sem UTM.

const CHAVE = "zampieri_utm";
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"] as const;

export type Utms = Partial<Record<(typeof CAMPOS)[number], string>>;

/** Guarda a origem do endereço atual, se houver. A última campanha que trouxe a pessoa prevalece. */
export const capturarUtms = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utms: Utms = {};
    for (const c of CAMPOS) {
      const v = params.get(c)?.trim();
      if (v) utms[c] = v.slice(0, c.endsWith("clid") ? 500 : 200);
    }
    if (Object.keys(utms).length === 0) return;
    localStorage.setItem(CHAVE, JSON.stringify({ ...utms, capturado_em: Date.now() }));
  } catch {
    // Navegador sem armazenamento (modo privado, bloqueio): segue sem origem
  }
};

const lerSalvo = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null") as (Utms & { capturado_em?: number }) | null;
    if (!salvo?.capturado_em || Date.now() - salvo.capturado_em > VALIDADE_MS) return null;
    return salvo;
  } catch {
    return null;
  }
};

/** Origem guardada nos últimos 30 dias, ou vazio. */
export const utmsGuardadas = (): Utms => {
  const salvo = lerSalvo();
  const utms: Utms = {};
  if (salvo) for (const c of CAMPOS) if (salvo[c]) utms[c] = salvo[c];
  return utms;
};

const cookie = (nome: string) => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

/**
 * Identificadores do Meta para a API de Conversões. Sem o cookie _fbc (pixel ainda não
 * carregou ou foi bloqueado), monta o fbc a partir do fbclid guardado, no formato do Meta.
 */
export const idsMeta = () => {
  const salvo = lerSalvo();
  const fbc = cookie("_fbc") || (salvo?.fbclid ? `fb.1.${salvo.capturado_em}.${salvo.fbclid}` : null);
  return { fbp: cookie("_fbp"), fbc };
};

export const novoEventId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
