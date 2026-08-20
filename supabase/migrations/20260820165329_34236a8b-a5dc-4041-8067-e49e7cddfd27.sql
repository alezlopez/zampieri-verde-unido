
REVOKE EXECUTE ON FUNCTION public.notificar_admin(text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_prematricula() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_agendamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_documento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_matricula() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_rematricula() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_devedor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_ingresso() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notif_pedido_produto() FROM PUBLIC, anon, authenticated;
