const ZAPSIGN_SIGN_URL = "https://api.zapsign.com.br/api/v1/sign/";

/**
 * Mapa de assinantes da empresa -> user_token da conta ZapSign.
 * Secret ZAPSIGN_BATCH_USER_TOKENS aceita:
 *  - objeto: { "email@empresa.com": "user_token", "Nome do Signatário": "user_token" }
 *  - array : ["user_token_2", "user_token_3", "user_token_4"] (signatários 2..N na ordem)
 *  - string: um único user_token para todos
 */
export const lerMapaUsuarios = (): { mapa: Record<string, string>; lista: string[] } => {
  const raw = Deno.env.get("ZAPSIGN_BATCH_USER_TOKENS");
  if (!raw) return { mapa: {}, lista: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { mapa: {}, lista: parsed.map(String) };
    if (parsed && typeof parsed === "object") {
      const mapa: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) mapa[String(k).trim().toLowerCase()] = String(v);
      return { mapa, lista: [] };
    }
  } catch {
    return { mapa: {}, lista: [raw.trim()] };
  }
  return { mapa: {}, lista: [] };
};

/** Assina em lote todos os signatários da empresa (todos menos o primeiro) que ainda estão pendentes. */
export const assinarEmLote = async (apiToken: string, signers: any[]) => {
  const { mapa, lista } = lerMapaUsuarios();
  if (!Object.keys(mapa).length && !lista.length) {
    return { executado: false, motivo: "ZAPSIGN_BATCH_USER_TOKENS não configurado" };
  }

  const empresa = signers.slice(1);
  const resultados: { signer: string; ok: boolean; detalhe?: unknown }[] = [];

  for (let i = 0; i < empresa.length; i++) {
    const s = empresa[i];
    if (String(s?.status ?? "").toLowerCase() === "signed") continue;

    const chaveEmail = String(s?.email ?? "").trim().toLowerCase();
    const chaveNome = String(s?.name ?? "").trim().toLowerCase();
    const userToken =
      mapa[chaveEmail] ?? mapa[chaveNome] ?? (lista.length === 1 ? lista[0] : lista[i]);

    if (!userToken || !s?.token) {
      resultados.push({
        signer: s?.name ?? `#${i + 2}`,
        ok: false,
        detalhe: `user_token não mapeado (email: ${chaveEmail || "vazio"})`,
      });
      continue;
    }

    try {
      const r = await fetch(ZAPSIGN_SIGN_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_token: userToken, signer_tokens: [s.token] }),
      });
      const txt = await r.text();
      if (!r.ok) console.error("ZapSign assinar em lote", s?.name, r.status, txt?.slice(0, 500));
      resultados.push({
        signer: s?.name ?? `#${i + 2}`,
        ok: r.ok,
        detalhe: r.ok ? undefined : txt?.slice(0, 300),
      });
    } catch (e) {
      console.error("ZapSign assinar em lote (exceção)", e);
      resultados.push({ signer: s?.name ?? `#${i + 2}`, ok: false, detalhe: String(e) });
    }
  }

  return { executado: true, resultados };
};
