
-- Recriar trigger
DROP TRIGGER IF EXISTS trg_atualizar_vagas ON public.ingressos;

CREATE TRIGGER trg_atualizar_vagas
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.ingressos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_vagas_disponiveis();

-- Recalcular vagas_disponiveis para todos os eventos
UPDATE eventos e
SET vagas_disponiveis = e.vagas_total - COALESCE(
  (SELECT SUM(i.quantidade) FROM ingressos i WHERE i.evento_id = e.id AND i.status IN ('pendente', 'pago')),
  0
);
