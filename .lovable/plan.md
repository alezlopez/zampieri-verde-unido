# Bloquear rematrícula quando não liberada

Só permitir o fluxo de rematrícula 2027 para alunos com `rematricula_liberada = TRUE` na tabela `alunos_rematricula_2027`. Para os demais, ao selecionar o aluno após a busca (antes de qualquer envio de código por WhatsApp/e-mail), aparece a mensagem:

"Não foi possível seguir com sua rematrícula, por favor procure a secretaria da escola"

## Comportamento

```text
Digita CPF/telefone -> lista de alunos
   |-- aluno liberado      -> segue para escolha de canal e OTP
   |-- aluno NÃO liberado  -> aviso de bloqueio + link do WhatsApp da secretaria
```

O aviso substitui a etapa de canal; o usuário pode voltar e fazer nova busca.

## Detalhes técnicos

**Banco (migration)**
- `rematricula_2027_buscar`: incluir a coluna `rematricula_liberada` (com `COALESCE(..., false)`) no retorno, para o front decidir sem expor outros dados.
- `rematricula_2027_canais`: retornar vazio quando o aluno não estiver liberado.
- `rematricula_2027_abrir` e `rematricula_2027_salvar`: recusar (retorno vazio / `success=false` com mensagem `nao_liberada`) quando `rematricula_liberada` não for verdadeiro — trava também quem tentar chamar direto a API.

**Edge functions**
- `rematricula-2027-otp-enviar` e `rematricula-2027-checkout`: checar `rematricula_liberada` do aluno e responder 403 `rematricula_nao_liberada`, além da checagem de data que já existe.

**Frontend**
- `src/components/rematricula/types.ts`: campo `rematricula_liberada` em `AlunoResumo`.
- `src/pages/Rematricula2027.tsx`: nova fase `bloqueado` — ao selecionar um aluno não liberado, exibe o cartão de aviso com a mensagem e o link do WhatsApp da secretaria, com botão "Fazer nova busca".
