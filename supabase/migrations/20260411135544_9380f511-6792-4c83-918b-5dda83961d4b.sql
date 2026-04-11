CREATE OR REPLACE FUNCTION public.atualizar_vagas_disponiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelado', 'estornado') THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
    WHERE id = NEW.evento_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status IN ('cancelado', 'estornado') AND OLD.status NOT IN ('cancelado', 'estornado') THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
      WHERE id = OLD.evento_id;
    END IF;
    IF OLD.status IN ('cancelado', 'estornado') AND NEW.status NOT IN ('cancelado', 'estornado') THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
      WHERE id = NEW.evento_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.status NOT IN ('cancelado', 'estornado') THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
    WHERE id = OLD.evento_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;