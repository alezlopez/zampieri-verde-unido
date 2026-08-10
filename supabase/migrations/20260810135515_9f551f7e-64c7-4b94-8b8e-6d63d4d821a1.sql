ALTER TABLE public.matricula_documentos DROP CONSTRAINT IF EXISTS matricula_documentos_status_check;
ALTER TABLE public.matricula_documentos ADD CONSTRAINT matricula_documentos_status_check
  CHECK (status IN ('pendente','enviado','aprovado','rejeitado','aguardando_escola'));

UPDATE public.matricula_documentos SET tipo = 'rg_cpf_pai' WHERE tipo = 'rg_cpf_pais';