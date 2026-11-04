DO $$
DECLARE v_id uuid;
BEGIN
 SELECT m.id INTO STRICT v_id FROM public.matriculas m JOIN public.prematriculas p ON p.id=m.prematricula_id WHERE upper(p.protocolo)='A1733C99' AND p.aluno_nome='Lucas Daniel de Paula Isaias' AND m.contrato_assinado IS NOT TRUE;
 UPDATE public.matricula_documentos SET status='aprovado', motivo=NULL, updated_at=now() WHERE matricula_id=v_id;
 INSERT INTO public.matricula_documentos (matricula_id,tipo,storage_path,nome_arquivo,status,motivo) VALUES (v_id,'declaracao_transferencia','',NULL,'aprovado',NULL) ON CONFLICT (matricula_id,tipo) DO UPDATE SET status='aprovado',motivo=NULL,updated_at=now();
 UPDATE public.matriculas SET updated_at=now() WHERE id=v_id;
END $$;