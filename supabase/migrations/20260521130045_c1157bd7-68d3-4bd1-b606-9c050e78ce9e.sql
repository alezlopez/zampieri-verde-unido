
-- Revoga EXECUTE de anon (e public) apenas em funções administrativas.
-- Essas funções já validam internamente has_role(...,'admin'), então
-- usuários autenticados sem perfil admin continuam sendo barrados.

REVOKE EXECUTE ON FUNCTION public.marcar_ingresso_utilizado(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validar_meia_ingresso(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.marcar_produto_retirado(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_current_message_period() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_message_count(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purgar_asaas_webhook_events() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.marcar_ingresso_utilizado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_meia_ingresso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_produto_retirado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_message_period() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_message_count(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purgar_asaas_webhook_events() TO authenticated;
