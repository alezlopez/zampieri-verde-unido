-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20260305174315).

CREATE TABLE public.tarefas_concluidas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_aluno text NOT NULL,
  conteudo_id bigint NOT NULL REFERENCES public.conteudos_taredas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (codigo_aluno, conteudo_id)
);

ALTER TABLE public.tarefas_concluidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública tarefas_concluidas"
ON public.tarefas_concluidas FOR SELECT USING (true);

CREATE POLICY "Inserção pública tarefas_concluidas"
ON public.tarefas_concluidas FOR INSERT WITH CHECK (true);

CREATE POLICY "Deleção pública tarefas_concluidas"
ON public.tarefas_concluidas FOR DELETE USING (true);
