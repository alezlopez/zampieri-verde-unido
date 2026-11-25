-- Evento "só pelo link" (pedido do Alexandre, nov/2026): fica fora da página /eventos, mas o link do evento
-- continua valendo para quem recebeu (ex.: alunos da lista de espera). Não é trava de acesso: quem tem o link
-- compra normalmente. "ativo = false" continua desligando o evento e o link.
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS visivel_na_lista boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.eventos.visivel_na_lista IS
  'false = não aparece na página /eventos, mas o link direto (/eventos/:id) continua funcionando.';
