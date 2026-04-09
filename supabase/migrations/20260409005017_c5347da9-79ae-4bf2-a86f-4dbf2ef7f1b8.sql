
ALTER TABLE public.eventos ADD COLUMN tipo_evento text NOT NULL DEFAULT 'alunos_convidados';

ALTER TABLE public.ingressos ADD COLUMN tipo_participante text NOT NULL DEFAULT 'aluno';
ALTER TABLE public.ingressos ADD COLUMN nome_participante text;
ALTER TABLE public.ingressos ADD COLUMN cpf_participante text;
ALTER TABLE public.ingressos ADD COLUMN data_nascimento_participante text;
ALTER TABLE public.ingressos ADD COLUMN email_participante text;
ALTER TABLE public.ingressos ADD COLUMN celular_participante text;
