// Regras: mínimo 6 caracteres, com letra minúscula, maiúscula, número e caractere especial.
export const PASSWORD_REQUIREMENTS_TEXT =
  "A senha deve ter no mínimo 6 caracteres e conter: letra minúscula, letra maiúscula, número e caractere especial (ex: !@#$%&*).";

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 6) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  const missing: string[] = [];
  if (!/[a-z]/.test(password)) missing.push("letra minúscula");
  if (!/[A-Z]/.test(password)) missing.push("letra maiúscula");
  if (!/[0-9]/.test(password)) missing.push("número");
  if (!/[^A-Za-z0-9]/.test(password)) missing.push("caractere especial (ex: !@#$%&*)");
  if (missing.length === 0) return null;
  return `A senha precisa conter: ${missing.join(", ")}.`;
}

// Traduz mensagens de erro do Supabase relacionadas à senha para PT-BR claro.
export function translatePasswordError(message: string | undefined | null): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (
    m.includes("password should contain") ||
    m.includes("weak_password") ||
    m.includes("password is too weak") ||
    (m.includes("password") && (m.includes("lowercase") || m.includes("uppercase") || m.includes("digit") || m.includes("symbol") || m.includes("special")))
  ) {
    return PASSWORD_REQUIREMENTS_TEXT;
  }
  if (m.includes("password should be at least") || (m.includes("password") && m.includes("at least"))) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  return null;
}
