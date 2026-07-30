export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export const maskCpf = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};

export const maskTelefone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d{1,3})$/, "$1-$2");

export const maskDataBr = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
};

/** "31/12/2015" -> "2015-12-31" (ISO) ou null */
export const brToIso = (v: string): string | null => {
  const d = onlyDigits(v);
  if (d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4, 8));
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > 2100) return null;
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
};

export const isoToBr = (v?: string | null): string => {
  if (!v) return "";
  const [a, m, d] = v.split("-");
  if (!a || !m || !d) return "";
  return `${d}/${m}/${a}`;
};

export const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11 % 10;
  if (resto !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11 % 10;
  return resto === Number(cpf[10]);
};

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());

export const formatBRL = (v?: number | string | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export async function buscarCep(cep: string) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const json = await res.json();
    if (json?.erro) return null;
    return {
      logradouro: json.logradouro as string,
      cidade: json.localidade as string,
      estado: json.uf as string,
    };
  } catch {
    return null;
  }
}

export const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Separado(a)",
  "Viúvo(a)",
  "União estável",
];
