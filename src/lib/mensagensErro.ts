import { translatePasswordError } from "@/lib/passwordValidation";

export const CONTATO_SECRETARIA = "Se o problema continuar, fale com a secretaria pelo WhatsApp (11) 93934-1503.";

const GENERICA = `Não foi possível concluir agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`;
const SESSAO = "Sua sessão expirou. Entre novamente e repita a operação.";
const PERMISSAO = "Você não tem permissão para fazer isso. Peça acesso a um administrador.";

/**
 * Códigos que as edge functions e as funções do banco devolvem em `error`.
 * Mensagens que já chegam em português claro passam direto e não precisam estar aqui.
 */
const CODIGOS: Record<string, string> = {
  // Sessão e permissão
  unauthorized: SESSAO,
  nao_autenticado: SESSAO,
  "não autenticado": SESSAO,
  "sessão inválida": SESSAO,
  forbidden: PERMISSAO,
  sem_permissao: PERMISSAO,
  sem_papeis: PERMISSAO,
  nao_autorizado: PERMISSAO,
  "apenas admin": PERMISSAO,
  "acesso negado": PERMISSAO,
  nao_remova_a_si: "Você não pode remover o seu próprio acesso.",
  nao_remova_seu_admin: "Você não pode remover o seu próprio perfil de administrador.",

  // Tentativas e códigos de verificação
  muitas_tentativas: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  codigo_incorreto: "Código incorreto. Confira os 6 dígitos que enviamos e tente novamente.",
  codigo_invalido: "Código inválido. Confira os 6 dígitos que enviamos e tente novamente.",
  codigo_expirado: "Este código expirou. Peça um novo código.",
  codigo_nao_encontrado: "Não encontramos um código ativo. Peça um novo código.",
  otp_nao_verificado: "Confirme o código enviado para o seu WhatsApp antes de continuar.",
  otp_email_nao_verificado: "Confirme o código enviado para o seu e-mail antes de continuar.",
  canal_invalido: "Escolha por onde quer receber o código (WhatsApp ou e-mail).",
  canal_indisponivel: "Não temos esse contato cadastrado. Escolha outra opção ou fale com a secretaria.",
  envio_falhou: `Não conseguimos enviar o código agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  falha_envio: `Não conseguimos enviar a mensagem agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  resend_falhou: `Não conseguimos enviar o e-mail agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  token_invalido: "Este link não é mais válido. Use o link mais recente que enviamos ou fale com a secretaria.",

  // Dados enviados
  dados_invalidos: "Alguns dados estão incompletos ou inválidos. Confira os campos destacados e tente novamente.",
  dados_ausentes: "Não recebemos os dados do formulário. Recarregue a página e tente novamente.",
  campos_obrigatorios: "Preencha todos os campos obrigatórios.",
  invalid_input: "Alguns dados estão inválidos. Confira e tente novamente.",
  "parâmetros inválidos": "Alguns dados estão inválidos. Recarregue a página e tente novamente.",
  "body inválido": "Alguns dados estão inválidos. Recarregue a página e tente novamente.",
  "invalid json": "Alguns dados estão inválidos. Recarregue a página e tente novamente.",
  "invalid payload": "Alguns dados estão inválidos. Recarregue a página e tente novamente.",
  cpf_invalido: "CPF inválido. Confira os números digitados.",
  email_invalido: "E-mail inválido. Confira se foi digitado corretamente.",
  email_em_uso: "Este e-mail já está em uso por outra conta.",
  senha_curta: "A senha precisa ter pelo menos 8 caracteres.",
  formato_invalido: "Formato inválido. Confira o dado informado.",
  id_invalido: "Registro inválido. Recarregue a página e tente novamente.",
  id_aluno_invalido: "Aluno inválido. Recarregue a página e tente novamente.",
  "id_aluno inválido": "Aluno inválido. Recarregue a página e tente novamente.",
  user_id_obrigatorio: "Selecione o usuário.",
  acao_invalida: "Ação inválida. Recarregue a página e tente novamente.",
  estado_invalido: "Esta ação não está disponível no momento. Recarregue a página.",
  status_invalido: "Esta ação não está disponível para a situação atual. Recarregue a página.",
  tipo_invalido: "Tipo inválido. Recarregue a página e tente novamente.",
  destino_invalido: "Destino inválido. Recarregue a página e tente novamente.",
  resposta_invalida: "Resposta inválida. Escolha uma das opções disponíveis.",
  motivo_obrigatorio: "Informe o motivo.",
  motivo_invalido: "Motivo inválido. Escolha uma das opções.",
  desconto_invalido: "Desconto inválido.",
  invalid_taxa: "Taxa inválida.",

  // Arquivos
  arquivo_grande: "O arquivo é grande demais. Envie um arquivo de até 10 MB.",
  arquivo_tipo: "Tipo de arquivo não aceito. Envie PDF, JPG ou PNG.",
  arquivo_invalido: "Arquivo inválido. Envie PDF, JPG ou PNG.",
  arquivo_ausente: "Selecione um arquivo para enviar.",
  sem_arquivo: "Selecione um arquivo para enviar.",
  documento_bloqueado: "Este documento já foi analisado e não pode mais ser alterado.",
  documentos_pendentes: "Ainda há documentos pendentes de envio.",
  documentos_faltando: "Ainda faltam documentos obrigatórios.",
  documentos_nao_aprovados: "Os documentos ainda não foram aprovados pela secretaria.",

  // Registros
  not_found: "Registro não encontrado. Recarregue a página.",
  nao_encontrado: "Não encontramos esse cadastro. Confira os dados informados.",
  nao_encontrada: "Não encontramos esse cadastro. Confira os dados informados.",
  aluno_nao_encontrado: "Aluno não encontrado. Confira os dados ou fale com a secretaria.",
  aluno_nao_identificado: "Não conseguimos identificar o aluno. Confira os dados ou fale com a secretaria.",
  "erro ao consultar aluno": GENERICA,

  // Matrícula, pré-matrícula e rematrícula
  aluno_duplicado: "Já existe uma pré-matrícula para este aluno.",
  responsavel_ja_utilizado: "Este responsável já foi usado em outra pré-matrícula.",
  responsavel_incompleto: "Os dados do responsável estão incompletos. Complete o cadastro e tente novamente.",
  serie_incompativel: "A série escolhida não é compatível com a data de nascimento do aluno.",
  horario_indisponivel: "Este horário acabou de ser ocupado. Escolha outro horário.",
  etapa_encerrada: "Esta etapa já foi encerrada.",
  etapa_indisponivel: "Esta etapa ainda não está disponível.",
  sem_etapa: "Esta etapa ainda não está disponível.",
  rematricula_nao_liberada:
    "A rematrícula deste aluno está bloqueada por pendências financeiras. Regularize em colegiozampieri.com.br/renegociacao ou fale com a secretaria.",
  nao_liberada:
    "A rematrícula deste aluno está bloqueada por pendências financeiras. Regularize em colegiozampieri.com.br/renegociacao ou fale com a secretaria.",
  sem_vagas: "O turno escolhido não tem mais vagas. Selecione outro turno.",
  turno_indisponivel: "O turno escolhido não está disponível. Selecione outro turno.",
  rematricula_isenta: "Este aluno está isento do valor de rematrícula.",
  matricula_isenta: "Esta matrícula está isenta de pagamento.",
  matricula_nao_concluida: "A matrícula ainda não foi concluída.",
  contrato_nao_assinado: "O contrato ainda não foi assinado.",
  contrato_assinado: "O contrato já foi assinado e não pode mais ser alterado.",
  falha_contrato: `Não conseguimos gerar o contrato agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  zapsign_nao_configurado: `A geração de contratos está temporariamente indisponível. ${CONTATO_SECRETARIA}`,
  valor_nao_configurado: `O valor ainda não foi configurado para este curso. ${CONTATO_SECRETARIA}`,
  valores_pendentes: `Os valores ainda não foram configurados. ${CONTATO_SECRETARIA}`,
  sem_numeros_disponiveis: "Não há mais números da sorte disponíveis.",

  // Pagamentos
  ja_pago: "Este pagamento já foi confirmado.",
  ja_cancelado: "Este item já foi cancelado.",
  debitos_ja_pagos: "Estes débitos já constam como pagos. Atualize a página.",
  debito_nao_encontrado: "Débito não encontrado. Atualize a página.",
  nenhum_debito_selecionado: "Selecione pelo menos uma mensalidade.",
  selecao_invalida: "A seleção mudou. Atualize a página e escolha de novo.",
  forma_invalida: "Escolha uma forma de pagamento válida.",
  "forma de pagamento inválida": "Escolha uma forma de pagamento válida.",
  avista_indisponivel: "O pagamento à vista não está disponível para esta opção.",
  parcelado_indisponivel: "O pagamento parcelado não está disponível para esta opção.",
  valor_invalido: "Não foi possível calcular o valor. Atualize a página e tente novamente.",
  checkout_sem_link: `Não conseguimos gerar o link de pagamento. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  "checkout criado sem link": `Não conseguimos gerar o link de pagamento. Tente novamente em instantes. ${CONTATO_SECRETARIA}`,
  falha_cliente_asaas: `Não conseguimos registrar seus dados no sistema de pagamento. ${CONTATO_SECRETARIA}`,
  "falha ao criar cliente no asaas": `Não conseguimos registrar seus dados no sistema de pagamento. ${CONTATO_SECRETARIA}`,
  "dados do responsável financeiro incompletos":
    "Os dados do responsável financeiro (nome e CPF) estão incompletos. Fale com a secretaria para atualizar o cadastro.",
  cota_meia_esgotada: "As vagas de meia-entrada acabaram. Selecione 'inteira' para continuar.",
  estoque_insuficiente: "Não há estoque suficiente para a quantidade escolhida.",
  "comprador sem cpf/nome": "Complete seu cadastro (nome e CPF) antes de comprar.",
  "comprador sem cpf/nome cadastrado": "Complete seu cadastro (nome e CPF) antes de comprar.",
  "comprador sem dados": "Complete seu cadastro (nome e CPF) antes de comprar.",
  "ingressos de eventos diferentes": "Os ingressos selecionados são de eventos diferentes. Pague um evento de cada vez.",
  "ingressos não pertencem ao usuário": "Estes ingressos pertencem a outra conta. Entre com a conta que fez a reserva.",
  "pedidos não pertencem ao usuário": "Estes pedidos pertencem a outra conta. Entre com a conta que fez o pedido.",
  refund_failed: `Não conseguimos estornar o pagamento agora. ${CONTATO_SECRETARIA}`,

  // Portaria (scanner de ingressos e produtos)
  ja_retirado: "Este produto já foi retirado.",
  ja_validada: "A meia-entrada deste ingresso já foi validada.",
  nao_e_meia: "Este ingresso não é de meia-entrada.",
  meia_nao_validada: "Valide o documento de meia-entrada antes de liberar a entrada.",
  nao_pago: "Este ingresso ainda não está pago.",

  // Rede
  falha_rede: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",

  // Importações (admin)
  lista_vazia: "A lista enviada está vazia.",
  linha_invalida: "Há linhas sem id do aluno, vencimento ou valor à vista. Corrija a planilha e envie de novo.",
  linha_duplicada: "Há mensalidades repetidas na planilha (mesmo aluno, evento e vencimento).",

  // Genéricos do servidor
  erro_interno: GENERICA,
  "erro inesperado": GENERICA,
  falha_criar: GENERICA,
  falha_senha: GENERICA,
  falha_validacao: GENERICA,
};

type ErroLike = unknown;

/** Texto bruto de qualquer formato de erro (string, Error, {message}, {error}). */
export const textoDoErro = (erro: ErroLike): string => {
  if (!erro) return "";
  if (typeof erro === "string") return erro;
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "object") {
    const o = erro as { error?: unknown; message?: unknown };
    if (typeof o.error === "string") return o.error;
    if (typeof o.message === "string") return o.message;
  }
  return String(erro);
};

// Texto já escrito para a família: português, com espaço e sem cara de código técnico
const pareceMensagemPronta = (t: string) =>
  /\s/.test(t) &&
  /[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]|\b(não|nao|já|para|seu|sua|este|esta|faça|verifique|confira|tente)\b/i.test(t) &&
  !/\b(error|failed|invalid|violates|exception|null|undefined|status code|function|asaas \d{3})\b/i.test(t);

/**
 * Converte qualquer erro (Supabase Auth, banco, edge function, rede) em uma mensagem
 * em português que diz o que fazer. Nunca devolve texto técnico em inglês.
 */
export const mensagemAmigavel = (erro: ErroLike, contexto: "cpf" | "email" = "email"): string => {
  const original = textoDoErro(erro).trim();
  const m = original.toLowerCase();
  if (!m) return GENERICA;

  const codigo = CODIGOS[m] ?? CODIGOS[m.split(":")[0].trim()];
  if (codigo) return codigo;

  const senha = translatePasswordError(m);
  if (senha) return senha;

  // Supabase Auth
  if (m.includes("invalid login credentials")) {
    return contexto === "cpf"
      ? "CPF ou senha incorretos. Se é o seu primeiro acesso, clique em \"Cadastrar\" para criar a senha; se esqueceu, use \"Esqueci minha senha\"."
      : "E-mail ou senha incorretos. Confira os dados ou use \"Esqueci minha senha\".";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para o seu e-mail (veja também o spam).";
  }
  if (m.includes("already registered") || m.includes("user already") || m.includes("already been registered")) {
    return "Já existe uma conta com este e-mail. Faça login ou use \"Esqueci minha senha\".";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes")) {
    return CODIGOS.muitas_tentativas;
  }
  if (m.includes("otp_expired") || m.includes("invalid or has expired") || m.includes("link is invalid")) {
    return "Este link expirou ou já foi usado. Peça um novo link e use o mais recente.";
  }
  if (m.includes("different from the old password") || m.includes("same_password")) {
    return "A nova senha precisa ser diferente da senha anterior.";
  }
  if (m.includes("invalid format") || (m.includes("email address") && m.includes("invalid"))) {
    return CODIGOS.email_invalido;
  }

  // Sistema de pagamento (Asaas)
  if (m.includes("cpf/cnpj") || (m.startsWith("asaas") && m.includes("cpf"))) {
    return "O CPF do responsável financeiro não foi aceito pelo sistema de pagamento. Fale com a secretaria para corrigir o cadastro.";
  }
  if (/^asaas \d{3}/.test(m)) {
    return `O sistema de pagamento recusou a operação agora. Tente novamente em instantes. ${CONTATO_SECRETARIA}`;
  }

  // Sessão expirada (JWT) e permissões do banco
  if (m.includes("jwt expired") || m.includes("invalid jwt") || m.includes("refresh token") || m.includes("auth session missing")) {
    return SESSAO;
  }
  if (m.includes("row-level security") || m.includes("permission denied")) return PERMISSAO;

  // Banco
  if (m.includes("duplicate key") || m.includes("unique constraint")) return "Este registro já existe.";
  if (m.includes("violates foreign key")) return "Este registro está ligado a outros dados e não pode ser alterado ou removido.";
  if (m.includes("not-null") || m.includes("violates check constraint")) {
    return "Algum campo obrigatório ficou vazio ou com valor inválido. Confira e tente novamente.";
  }

  // Rede
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed") ||
    m.includes("failed to send a request")
  ) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "O servidor demorou para responder. Tente novamente em instantes.";
  }

  if (pareceMensagemPronta(original)) return original;

  console.error("Erro sem tradução:", original);
  return GENERICA;
};

/**
 * Edge functions que respondem 4xx/5xx não preenchem `data` no supabase-js: o corpo
 * com o motivo fica em `error.context`. Devolve o campo `error` desse corpo, se houver.
 */
export const erroDaFunction = async (error: unknown, data: unknown): Promise<string | null> => {
  const doData = (data as { error?: unknown } | null)?.error;
  if (typeof doData === "string" && doData) return doData;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    const corpo = await ctx.clone().json().catch(() => null);
    if (typeof corpo?.error === "string" && corpo.error) return corpo.error;
  }
  return null;
};

/** Mensagem amigável para o resultado de supabase.functions.invoke, lendo o motivo real. */
export const mensagemDaFunction = async (error: unknown, data: unknown, contexto: "cpf" | "email" = "email") =>
  mensagemAmigavel((await erroDaFunction(error, data)) || error, contexto);
