-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20251114140448).

-- Criar tabela para lista VIP
CREATE TABLE public.lista_vip (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nome_responsavel text NOT NULL,
  nome_aluno text NOT NULL,
  serie_aluno text NOT NULL,
  cpf_responsavel text NOT NULL,
  whatsapp_responsavel text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lista_vip ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção pública
CREATE POLICY "Permitir inserção pública na lista VIP"
ON public.lista_vip
FOR INSERT
TO public
WITH CHECK (true);

-- Política para administradores lerem os dados
CREATE POLICY "Administradores podem ler lista VIP"
ON public.lista_vip
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
