UPDATE public.eventos
   SET vagas_disponiveis = GREATEST(0, vagas_total - (
       SELECT COALESCE(SUM(quantidade), 0)
         FROM public.ingressos
        WHERE evento_id = eventos.id
          AND status NOT IN ('cancelado','estornado')
   ))
 WHERE id = '87f20c66-bbe0-48b2-84f3-d47008f12136';