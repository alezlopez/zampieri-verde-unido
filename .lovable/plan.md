

## Adicionar Autorização, Termos de Uso e Aviso de Cancelamento na Reserva

### Resumo
Três adições à tela de reserva de ingressos (`EventoCompra.tsx`): (1) autorização obrigatória para eventos que requerem, (2) termos de compra obrigatórios para todos os eventos, e (3) aviso informativo sobre cancelamento automático da reserva.

### O que será feito

**1. Autorização obrigatória (eventos com `requer_autorizacao = true`)**
- Antes do botão "Reservar", exibir um bloco com o texto da autorização preenchido dinamicamente (nome do responsável, CPF, nome de cada aluno selecionado, nome do evento, data e hora)
- O texto ficará dentro de uma caixa com scroll (`max-h` fixo) e o botão "Autorizo" só será habilitado quando o usuário rolar até o final do texto
- Usar um `onScroll` handler para detectar que o scroll chegou ao fim
- Checkbox "Autorizo a participação conforme descrito acima" — só habilitado após scroll completo
- O botão "Reservar Ingressos" ficará desabilitado enquanto a autorização não for aceita

**2. Termos de compra obrigatórios (todos os eventos)**
- Exibir o termo completo em uma caixa com scroll (similar à autorização)
- Mesmo mecanismo: botão de aceite só habilitado após rolar todo o conteúdo
- Checkbox "Li e aceito os termos de compra, participação e tratamento de dados"
- O botão "Reservar" fica desabilitado enquanto os termos não forem aceitos

**3. Aviso de cancelamento automático**
- Adicionar um banner informativo (azul/cinza) acima do botão de reserva:
  > "A reserva do ingresso será cancelada automaticamente após 2 horas caso o pagamento não seja realizado, sendo necessário uma nova reserva para participação mediante a disponibilidade de vagas."

### Ordem na tela (dentro do card, após forma de pagamento)
1. Aviso de cancelamento automático (banner informativo)
2. Termos de compra (scroll + checkbox) — sempre visível
3. Autorização (scroll + checkbox) — somente se `evento.requer_autorizacao`
4. Resumo de total + botão Reservar

### Detalhes técnicos

**Arquivo: `src/pages/EventoCompra.tsx`**

- Novos estados: `termosAceitos`, `autorizacaoAceita`, `termosScrolledToEnd`, `autorizacaoScrolledToEnd`
- Função helper `handleScroll` que compara `scrollTop + clientHeight >= scrollHeight - 10` para detectar fim do scroll
- O texto da autorização será gerado dinamicamente com base nos alunos selecionados — se nenhum aluno estiver selecionado, mostrar placeholder
- Ambos os checkboxes resetam se o usuário mudar a seleção de alunos (para autorização) 
- O botão "Reservar" ganha condições extras: `termosAceitos` e (se `requer_autorizacao`) `autorizacaoAceita`

**Componentes auxiliares** — tudo inline no mesmo arquivo para simplicidade, usando `ScrollArea` ou div com overflow-y-auto.

