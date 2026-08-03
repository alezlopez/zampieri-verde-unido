CREATE TABLE IF NOT EXISTS public.rematricula_2027_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno bigint NOT NULL,
  finalidade text NOT NULL DEFAULT 'login',
  canal text NOT NULL,
  chave text,
  destino_mascarado text NOT NULL,
  codigo_hash text NOT NULL,
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  consumido_em timestamptz,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remat_otp_aluno ON public.rematricula_2027_otp (id_aluno, created_at DESC);

GRANT ALL ON public.rematricula_2027_otp TO service_role;

ALTER TABLE public.rematricula_2027_otp ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rematricula_2027_canais(p_id_aluno bigint)
RETURNS TABLE(chave text, canal text, rotulo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  a public.alunos_rematricula_2027%ROWTYPE;
  v_tel text;
  v_mail text;
BEGIN
  IF NOT public.rematricula_2027_rate_hit('canais', 20, 300) THEN
    RAISE EXCEPTION 'muitas_tentativas' USING HINT = 'Aguarde alguns minutos e tente novamente.';
  END IF;

  SELECT * INTO a FROM public.alunos_rematricula_2027 WHERE id_aluno = p_id_aluno LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- WhatsApp mãe
  v_tel := regexp_replace(COALESCE(a.celular_mae, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_mae'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  -- WhatsApp pai
  v_tel := regexp_replace(COALESCE(a.celular_pai, ''), '[^0-9]', '', 'g');
  IF length(v_tel) >= 10 THEN
    chave := 'celular_pai'; canal := 'whatsapp';
    rotulo := '(' || substr(v_tel, 1, 2) || ') •••••-' || right(v_tel, 4);
    RETURN NEXT;
  END IF;

  -- E-mail mãe
  v_mail := lower(trim(COALESCE(a.email_mae, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_mae'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  -- E-mail pai
  v_mail := lower(trim(COALESCE(a.email_pai, '')));
  IF position('@' in v_mail) > 1 THEN
    chave := 'email_pai'; canal := 'email';
    rotulo := left(split_part(v_mail, '@', 1), 2) || '•••@' || split_part(v_mail, '@', 2);
    RETURN NEXT;
  END IF;

  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.rematricula_2027_canais(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rematricula_2027_canais(bigint) TO anon, authenticated, service_role;