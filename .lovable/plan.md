

## Plano: Checkbox "Requer Autorização" + Upload de Imagem no Formulário de Evento

### 1. Migração no banco de dados

Adicionar a coluna `requer_autorizacao` (boolean, default false) na tabela `eventos`.

```sql
ALTER TABLE public.eventos ADD COLUMN requer_autorizacao boolean NOT NULL DEFAULT false;
```

### 2. Upload de imagem via Supabase Storage

O bucket `zampieri` já existe e é público. Vamos utilizá-lo para armazenar as imagens dos eventos no path `eventos/`.

Precisamos adicionar uma política RLS no `storage.objects` para permitir que admins façam upload:

```sql
CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'zampieri'
  AND (storage.foldername(name))[1] = 'eventos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'zampieri'
  AND (storage.foldername(name))[1] = 'eventos'
  AND public.has_role(auth.uid(), 'admin')
);
```

### 3. Alterações no `EventosAdmin.tsx`

- Adicionar estado `requerAutorizacao` (boolean)
- Substituir o campo de URL da imagem por um `<input type="file">` que faz upload para `zampieri/eventos/` e salva a URL pública no campo `imagem_url`
- Adicionar checkbox "Requer autorização?" usando o componente `Checkbox`
- Atualizar `handleSave` para incluir `requer_autorizacao` no payload
- Atualizar `handleEdit` para carregar o valor de `requer_autorizacao`
- Atualizar `resetForm` para limpar o estado
- Atualizar a interface `Evento` para incluir `requer_autorizacao`

### 4. Páginas que consomem eventos

- `Eventos.tsx` e `EventoCompra.tsx`: exibir badge ou aviso quando o evento requer autorização (ajuste visual menor)

### Detalhes técnicos

- Upload usa `supabase.storage.from('zampieri').upload('eventos/{timestamp}_{filename}', file)`
- URL pública via `supabase.storage.from('zampieri').getPublicUrl(path)`
- Preview da imagem no formulário antes/depois do upload
- A coluna `requer_autorizacao` será lida via `.select("*")` existente, sem necessidade de alterar queries

