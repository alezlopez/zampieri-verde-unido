

## Problem

The user `alexandrezlopez@gmail.com` (CPF 37119355830) has **no `cpf` in their `user_metadata`**. The `EventoCompra` page checks `user.user_metadata.cpf` to call `find_alunos_by_cpf` -- when it's null/undefined, it skips the RPC call entirely and shows "Nenhum aluno encontrado."

This affects any user who:
- Registered before CPF metadata was added
- Logged in via admin email path
- Had a session where `updateUser` didn't persist

The CPF 29906715871 works because that user (`claudiceia3411@gmail.com`) was registered via `registerWithCpf`, which stores CPF at signup time.

## Solution

Two changes to make this work reliably for **all** CPFs:

### 1. New database RPC: `find_alunos_by_email`
Create a `SECURITY DEFINER` function that looks up students by matching a parent's email address in `alunos_26`. This serves as a fallback when CPF is not available in metadata.

```sql
CREATE OR REPLACE FUNCTION public.find_alunos_by_email(p_email text)
RETURNS TABLE(codigo_aluno text, nome_aluno text, curso text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.codigo_aluno, a.nome_aluno, a.curso
  FROM alunos_26 a
  WHERE lower(trim(a.email_pai)) = lower(trim(p_email))
     OR lower(trim(a.email_mae)) = lower(trim(p_email));
END;
$$;
```

### 2. Update `EventoCompra.tsx` fetchAlunos logic
Change the student lookup to:
1. First try by CPF from `user_metadata.cpf` (current behavior)
2. If CPF is missing, fall back to looking up by the user's email via the new RPC
3. If both fail, show the "no students" message

```text
Flow:
  user has cpf in metadata? 
    → YES → call find_alunos_by_cpf(cpf)
    → NO  → call find_alunos_by_email(user.email)
```

This ensures every logged-in user whose email matches a parent record in `alunos_26` will see their students, regardless of how they logged in or whether their metadata contains a CPF.

### Files affected
- **New migration**: `find_alunos_by_email` RPC
- **`src/pages/EventoCompra.tsx`**: Update `fetchAlunos` useEffect with email fallback

