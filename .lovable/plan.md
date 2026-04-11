

## Problem Analysis

The "CPF não encontrado na base de alunos" error occurs despite the `find_email_by_cpf` RPC working correctly at the database level. The root cause is likely:

1. **Stale session interference**: The console shows `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`. This corrupted session state can cause the Supabase client to fail on subsequent calls (including the RPC), returning an error instead of data.

2. **Missing error logging**: The `findEmailByCpf` function silently returns `null` on error, making it impossible to distinguish between "CPF not found" and "RPC call failed due to auth error".

## Plan

### 1. Fix AuthContext to handle stale sessions
In `src/contexts/AuthContext.tsx`, update the `onAuthStateChange` handler to catch and clear invalid sessions (sign out on `TOKEN_REFRESHED` failure), preventing the corrupted client state.

### 2. Add error handling and logging to `findEmailByCpf`
Update the function to log errors so we can see if the RPC is failing vs returning no data. Also, if there's an error, attempt the call after signing out the stale session.

### 3. Ensure the RPC call succeeds even with no session
Add a fallback: if the RPC returns an error (possibly due to bad auth state), call `supabase.auth.signOut()` to clear the bad session and retry the RPC once.

### Technical Details

**File: `src/contexts/AuthContext.tsx`**

- In `findEmailByCpf`: add `console.error` when `error` is present
- In `onAuthStateChange`: handle `TOKEN_REFRESHED` errors by clearing session
- Add retry logic: if RPC fails with auth error, sign out stale session and retry

**File: `src/pages/EventosLogin.tsx`** (no changes needed - it correctly delegates to AuthContext)

