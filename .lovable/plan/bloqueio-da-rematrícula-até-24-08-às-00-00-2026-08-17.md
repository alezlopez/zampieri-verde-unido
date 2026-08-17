# Bloqueio da rematrícula até 24/08 às 00:00

A rota `/rematricula2027` fica em modo "em breve" e libera sozinha à meia-noite de 24/08/2026 (horário de Brasília), sem precisar de nenhuma ação manual.

## O que o visitante vê antes da abertura

Ao abrir `/rematricula2027` antes da data:
- Página com a identidade visual do colégio: logo, título "Rematrícula 2027 começa em 24/08".
- Contagem regressiva (dias, horas, minutos, segundos) até a abertura.
- Botões para `/rematricula2027/informativo` e `/rematricula2027/regulamento`, que continuam abertos normalmente.
- Quando o contador zera, a página libera o formulário automaticamente, sem recarregar.

## Bloqueio de verdade (não só visual)

Esconder a tela não basta: alguém poderia chamar as funções diretamente. Então as funções de servidor da rematrícula também recusam antes da data:
- envio e validação do código (OTP)
- geração do checkout de pagamento

Nesses casos a resposta é uma mensagem clara de "rematrícula ainda não liberada".

## Detalhes técnicos

- Constante compartilhada `REMATRICULA_ABERTURA = 2026-08-24T00:00:00-03:00` (fuso America/Sao_Paulo), definida uma vez no front (`src/components/rematricula/utils.ts`) e uma vez no backend (`supabase/functions/_shared/`).
- `src/pages/Rematricula2027.tsx`: se `Date.now() < abertura`, renderiza o novo componente `RematriculaEmBreve` (contador com `setInterval` de 1s que muda o estado ao atingir a data). Nenhuma lógica existente do wizard é alterada.
- Novo componente `src/components/rematricula/EmBreve.tsx`.
- Guard no início de `rematricula-2027-otp-enviar`, `rematricula-2027-otp-validar` e `rematricula-2027-checkout`: retorna 403 `{ error: "rematricula_nao_liberada" }` antes da data.
- Rotas de admin, followup, informativo e regulamento não são afetadas.
- O relógio usado no bloqueio real é o do servidor, então mexer no relógio do computador não libera nada.
