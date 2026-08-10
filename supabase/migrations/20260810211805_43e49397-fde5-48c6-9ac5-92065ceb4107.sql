
-- 1) View: respeitar permissões do usuário e restringir acesso
ALTER VIEW public.compradores_sem_cartela SET (security_invoker = true);
REVOKE ALL ON public.compradores_sem_cartela FROM anon, authenticated;
GRANT SELECT ON public.compradores_sem_cartela TO service_role;

-- 2) search_path fixo
ALTER FUNCTION public.match_documents(vector, integer, jsonb) SET search_path = public;

-- 3) Revogar execução anônima de funções internas/admin
REVOKE EXECUTE ON FUNCTION public.atualizar_vagas_disponiveis() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_gerar_numeros_sorte_2027() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_log_alteracoes_rematricula_2027() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_cota_meia() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_estoque_pedido_produto() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rematricula_2027_rate_hit(text, integer, integer) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.auth_user_exists_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_context_by_cpf(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_cpf(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.buscar_ingresso_scan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rematricula_2027_admin_conferir(bigint, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rematricula_2027_admin_listagem() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rematricula_2027_admin_editar_contatos(bigint, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rematricula_by_cpf(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rematricula_by_codigo_aluno(bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
