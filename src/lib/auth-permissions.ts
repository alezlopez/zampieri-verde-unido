export const SETORES = ["eventos", "produtos", "portaria", "matricula", "rematricula", "fotos"] as const;
export type Setor = (typeof SETORES)[number];

// A newer session invalidates every outstanding permission response.
export function createPermissionRequestGuard() {
  let version = 0;
  return {
    begin() {
      const request = ++version;
      return () => request === version;
    },
    invalidate() {
      version++;
    },
  };
}

export function allowedSetores(results: Array<{ data: unknown; error?: unknown }>): Setor[] {
  return SETORES.filter((_, i) => results[i]?.data === true && !results[i]?.error);
}