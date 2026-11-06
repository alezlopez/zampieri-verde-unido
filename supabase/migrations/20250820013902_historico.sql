-- Já aplicada em produção antes de existir no repositório.
-- SQL recuperado de supabase_migrations.schema_migrations (versão 20250820013902).

-- Deletar a função existente e recriar com a formatação correta
DROP FUNCTION IF EXISTS rematricula_by_cpf(text);

CREATE OR REPLACE FUNCTION rematricula_by_cpf(p_cpf text)
RETURNS TABLE(
  "Nome do Aluno" text,
  "Curso 2025" text,
  "Curso 2026" text,
  "Turno 2026" text,
  "Ciclo" text,
  "Cod Aluno" bigint,
  "Desconto" text,
  "mensalidade 2026 sem desconto" text,
  "mensalidade 2026 com desconto" text,
  "Rematrícula a vista" text,
  "Rematrícula Parcelada" text,
  "Status" text,
  "CPF do Pai" text,
  "CPF da mãe" text,
  "Nome do Pai" text,
  "Nome da Mãe" text,
  "Telefone do Pai" text,
  "Telefone da Mãe" text,
  "Email do Pai" text,
  "Email da Mãe" text,
  "Endereço" text,
  "Número" bigint,
  "Bairro" text,
  "Cidade" text,
  "CEP" text,
  "Resp. Financeiro" text,
  "Liberado para rematrícula" boolean,
  "Id Checkout" text,
  "Link Checkout" text,
  "Link Contrato" text,
  "token contrato" text
)
LANGUAGE plpgsql
AS $$
DECLARE
  cpf_clean text;
BEGIN
  -- Remove formatação do CPF (pontos, traços e espaços)
  cpf_clean := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  
  -- Busca por CPF do pai ou da mãe
  RETURN QUERY
  SELECT 
    r."Nome do Aluno",
    r."Curso 2025",
    r."Curso 2026", 
    r."Turno 2026",
    r."Ciclo",
    r."Cod Aluno",
    r."Desconto",
    r."mensalidade 2026 sem desconto",
    r."mensalidade 2026 com desconto",
    r."Rematrícula a vista",
    r."Rematrícula Parcelada",
    r."Status",
    r."CPF do Pai",
    r."CPF da mãe",
    r."Nome do Pai",
    r."Nome da Mãe",
    r."Telefone do Pai",
    r."Telefone da Mãe", 
    r."Email do Pai",
    r."Email da Mãe",
    r."Endereço",
    r."Número",
    r."Bairro",
    r."Cidade",
    r."CEP",
    r."Resp. Financeiro",
    r."Liberado para rematrícula",
    r."Id Checkout",
    r."Link Checkout",
    r."Link Contrato",
    r."token contrato"
  FROM rematricula r
  WHERE 
    regexp_replace(COALESCE(r."CPF do Pai", ''), '[^0-9]', '', 'g') = cpf_clean
    OR regexp_replace(COALESCE(r."CPF da mãe", ''), '[^0-9]', '', 'g') = cpf_clean;
END;
$$;
