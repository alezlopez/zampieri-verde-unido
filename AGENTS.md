# Architecture rules

- Administrative access must wait for server-validated permission loading, and stale session responses must be discarded so route guards never decide access from incomplete or previous-session roles.

# Deploy

- Site: o Easypanel publica a `main` automaticamente a partir do `Dockerfile` (porta 4173).
- Banco e edge functions: `.github/workflows/supabase-deploy.yml` roda `supabase db push` e publica as functions alteradas a cada push na `main` que mexa em `supabase/`.
- Cada arquivo em `supabase/migrations` tem a mesma versão registrada em `supabase_migrations.schema_migrations`. Ao aplicar uma migration direto no banco, nomeie o arquivo com a versão que o banco registrou; nunca renomeie nem edite migrations já aplicadas.
- Toda edge function precisa de uma entrada em `supabase/config.toml` com o `verify_jwt` que ela usa em produção.

# Integração com o WhatsZampieri

- O contrato entre o site e o WhatsZampieri (funil de famílias, `lead_update`, `lead-whatsapp`, etiquetas de origem, links `/visita` e `/pre`, onde estão os preços) está em `docs/integracao-site-whatszampieri.md`. A mesma cópia existe no repositório `alezlopez/whatszampieri`: ao mudar a integração, atualize as duas.
