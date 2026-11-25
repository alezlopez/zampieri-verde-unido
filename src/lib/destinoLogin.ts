/**
 * Para onde voltar depois do login do portal de eventos.
 * Ex.: família recebe o link de um evento oculto (só pelo link), clica em "Entrar para comprar" e, depois de
 * entrar, precisa voltar ao evento — a lista /eventos não mostra evento oculto.
 * O destino vem de ?voltar= (ou do state de navegação) e fica guardado 24 h no navegador, para valer também
 * quando a pessoa cria a conta e só entra depois de confirmar o e-mail.
 */
const CHAVE = "eventos_destino_login";
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const PADRAO = "/eventos";

/** Só caminhos internos do portal (evita redirecionar para fora do site). */
export function destinoValido(path: unknown): path is string {
  return (
    typeof path === "string" &&
    /^\/(eventos|produtos)(\/|\?|$)/.test(path) &&
    !path.startsWith("//") &&
    !path.startsWith("/eventos/login") &&
    !path.startsWith("/eventos/admin")
  );
}

/** Link para a tela de login que volta para `path` depois de entrar. */
export function linkLogin(path: string): string {
  return destinoValido(path) ? `/eventos/login?voltar=${encodeURIComponent(path)}` : "/eventos/login";
}

export function guardarDestino(path: string | null | undefined) {
  if (!destinoValido(path) || path === PADRAO) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ path, em: Date.now() }));
  } catch {
    /* navegador sem storage: segue só com o destino da URL */
  }
}

export function destinoGuardado(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (v && destinoValido(v.path) && Date.now() - Number(v.em) < VALIDADE_MS) return v.path;
  } catch {
    /* ignora */
  }
  return null;
}

/** Destino final do login (apaga o guardado). */
export function consumirDestino(): string {
  const d = destinoGuardado() || PADRAO;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
  return d;
}
