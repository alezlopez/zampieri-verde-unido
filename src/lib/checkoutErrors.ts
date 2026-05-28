// Centraliza tradução de erros técnicos de checkout/reserva em mensagens amigáveis.

export interface FriendlyError {
  title: string;
  description: string;
}

export function friendlyCheckoutError(err: unknown, fallbackTitle = "Não foi possível concluir"): FriendlyError {
  const raw = extractMessage(err).toLowerCase();

  // Banco / constraints
  if (raw.includes("not-null") || raw.includes("not null") || raw.includes("violates not-null")) {
    return {
      title: "Não foi possível concluir a reserva",
      description: "Tente novamente. Se o erro persistir, entre em contato com o suporte.",
    };
  }
  if (raw.includes("duplicate key") || raw.includes("unique constraint")) {
    return {
      title: "Reserva duplicada",
      description: "Você já tem uma reserva equivalente. Acesse 'Meus Ingressos'.",
    };
  }

  // Regras de negócio conhecidas
  if (raw.includes("cota_meia") || raw.includes("cota de meia")) {
    return {
      title: "Cota de meia-entrada esgotada",
      description: "As vagas de meia-entrada para este evento acabaram. Selecione 'inteira' para continuar.",
    };
  }
  if (raw.includes("vagas")) {
    return {
      title: "Vagas insuficientes",
      description: "Não há vagas suficientes disponíveis para esta reserva.",
    };
  }
  if (raw.includes("cpf") && (raw.includes("nome") || raw.includes("comprador"))) {
    return {
      title: "Cadastro incompleto",
      description: "Complete seu cadastro (CPF e nome) antes de comprar.",
    };
  }
  if ((raw.includes("cpf") || raw.includes("cnpj")) && (raw.includes("inválido") || raw.includes("invalido") || raw.includes("invalid"))) {
    return {
      title: "CPF inválido no cadastro",
      description: "O CPF cadastrado não foi reconhecido pela Receita Federal. Verifique se está correto ou entre em contato com a secretaria do colégio para corrigir o cadastro.",
    };
  }
  if (raw.includes("eventos diferentes")) {
    return {
      title: "Ingressos de eventos diferentes",
      description: "Os ingressos selecionados pertencem a eventos diferentes.",
    };
  }
  if (raw.includes("não pertencem") || raw.includes("nao pertencem") || raw.includes("não autenticado") || raw.includes("sessão inválida")) {
    return {
      title: "Sessão expirada",
      description: "Faça login novamente para continuar a compra.",
    };
  }
  if (raw.includes("valor total inválido") || raw.includes("valor inválido")) {
    return {
      title: "Valor inválido",
      description: "Não foi possível calcular o valor da compra. Recarregue a página e tente novamente.",
    };
  }

  // Rede / 5xx
  if (
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("timeout") ||
    raw.includes("503") ||
    raw.includes("502") ||
    raw.includes("500")
  ) {
    return {
      title: "Falha temporária",
      description: "Não conseguimos gerar a cobrança agora. Tente novamente em instantes.",
    };
  }

  return {
    title: fallbackTitle,
    description: "Tente novamente. Se o problema persistir, contate o suporte.",
  };
}

function extractMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const anyErr = err as any;
    return String(anyErr.error || anyErr.message || anyErr.detalhes || JSON.stringify(anyErr));
  }
  return String(err);
}
