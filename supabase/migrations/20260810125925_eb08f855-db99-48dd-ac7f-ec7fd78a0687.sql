ALTER TABLE public.prematriculas ADD COLUMN IF NOT EXISTS resp_tipo text;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS rg_pai text,
  ADD COLUMN IF NOT EXISTS estado_civil_pai text,
  ADD COLUMN IF NOT EXISTS naturalidade_pai text,
  ADD COLUMN IF NOT EXISTS nacionalidade_pai text,
  ADD COLUMN IF NOT EXISTS profissao_pai text,
  ADD COLUMN IF NOT EXISTS data_nascimento_pai date,
  ADD COLUMN IF NOT EXISTS rg_mae text,
  ADD COLUMN IF NOT EXISTS estado_civil_mae text,
  ADD COLUMN IF NOT EXISTS naturalidade_mae text,
  ADD COLUMN IF NOT EXISTS nacionalidade_mae text,
  ADD COLUMN IF NOT EXISTS profissao_mae text,
  ADD COLUMN IF NOT EXISTS data_nascimento_mae date,
  ADD COLUMN IF NOT EXISTS dados_preenchidos_em timestamptz;