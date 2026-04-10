
CREATE OR REPLACE FUNCTION public.atualizar_vagas_disponiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status != 'cancelado' THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
    WHERE id = NEW.evento_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
      WHERE id = OLD.evento_id;
    END IF;
    IF OLD.status = 'cancelado' AND NEW.status != 'cancelado' THEN
      UPDATE eventos SET vagas_disponiveis = vagas_disponiveis - NEW.quantidade
      WHERE id = NEW.evento_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.status != 'cancelado' THEN
    UPDATE eventos SET vagas_disponiveis = vagas_disponiveis + OLD.quantidade
    WHERE id = OLD.evento_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_atualizar_vagas
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.ingressos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_vagas_disponiveis();
