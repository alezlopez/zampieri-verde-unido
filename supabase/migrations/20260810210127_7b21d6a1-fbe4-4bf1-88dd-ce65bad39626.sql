REVOKE ALL ON FUNCTION public.get_comprador_dados(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.gerar_numeros_sorte_2027(bigint) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.authenticate_with_username(text, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_rematricula_fields(bigint, text, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.get_comprador_dados(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.gerar_numeros_sorte_2027(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.authenticate_with_username(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_rematricula_fields(bigint, text, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) TO service_role;