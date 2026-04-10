

## Plano: Bloquear compra quando vagas = 0

### O que já funciona
- `Eventos.tsx` (listagem): já mostra botão "Esgotado" quando `vagas_disponiveis <= 0`
- `EventoCompra.tsx`: já desabilita o botão quando `totalParticipantes > vagas_disponiveis`

### O que falta
1. **Na página de compra (`EventoCompra.tsx`)**: quando `vagas_disponiveis === 0`, exibir um aviso grande de "Esgotado" e esconder todo o formulário de compra, impedindo qualquer interação. Isso cobre o caso de acesso direto pela URL.

2. **Na listagem (`Eventos.tsx`)**: o comportamento já está correto (botão desabilitado + texto "Esgotado"). Vou adicionar um badge vermelho "ESGOTADO" visível no card para destaque maior.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/EventoCompra.tsx` | Bloquear formulário inteiro se `vagas_disponiveis === 0`, exibir mensagem "Esgotado" |
| `src/pages/Eventos.tsx` | Adicionar badge "ESGOTADO" no card quando vagas = 0 |

### Detalhes técnicos

Em `EventoCompra.tsx`, após carregar o evento, se `evento.vagas_disponiveis <= 0`, renderizar uma tela de bloqueio com mensagem "Este evento está esgotado" e botão para voltar à listagem, sem exibir formulário.

Em `Eventos.tsx`, adicionar um `<Badge variant="destructive">ESGOTADO</Badge>` no card header e aplicar opacidade reduzida na imagem quando vagas = 0.

