-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260305181330).


CREATE TABLE public.codigos_verificacao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_aluno text NOT NULL,
  tipo text NOT NULL,
  novo_valor text NOT NULL,
  codigo text NOT NULL,
  verificado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.codigos_verificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública codigos_verificacao"
ON public.codigos_verificacao FOR SELECT USING (true);

CREATE POLICY "Inserção pública codigos_verificacao"
ON public.codigos_verificacao FOR INSERT WITH CHECK (true);

CREATE POLICY "Update pública codigos_verificacao"
ON public.codigos_verificacao FOR UPDATE USING (true);
