DROP INDEX IF EXISTS public.prematriculas_aluno_unico;
CREATE UNIQUE INDEX prematriculas_aluno_ativa_unico ON public.prematriculas (aluno_chave, aluno_nascimento)
  WHERE status NOT IN ('reprovado','cancelado','desistente');
CREATE UNIQUE INDEX prematriculas_aluno_resp_unico ON public.prematriculas (aluno_chave, aluno_nascimento, resp_cpf);