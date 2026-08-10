# Roadmap visual da matrícula

Hoje a página do usuário (`/matricula`) mostra apenas quatro caixinhas numeradas lado a lado. Elas indicam a etapa, mas não comunicam progresso nem o que falta fazer. A proposta é substituir isso por um roadmap visual claro.

## O que muda para a família

- Uma trilha de progresso com 4 marcos: Documentos, Dados do contrato, Assinatura, Pagamento.
- Cada marco mostra estado: concluído (círculo verde com check), atual (círculo destacado com anel/pulso e número), pendente (círculo cinza).
- Linha conectora entre os marcos que preenche em verde conforme o progresso avança.
- Abaixo do marco atual, uma frase curta dizendo o que a família precisa fazer agora (ex.: "Envie os documentos", "Aguardando conferência da secretaria", "Assine o contrato", "Faça o pagamento").
- Barra/percentual de conclusão ("Etapa 2 de 4 · 50% concluído").
- No desktop, trilha horizontal; no mobile, trilha vertical com os textos ao lado, para não espremer os rótulos.
- Ao concluir tudo, a trilha aparece inteira verde acima da mensagem de matrícula confirmada.

Nenhuma regra de negócio muda: o roadmap só lê o estado que a página já calcula.

## Detalhes técnicos

- Novo componente `src/components/matricula/RoadmapEtapas.tsx`, recebendo `etapaAtual: number` e `status: string` (para diferenciar "em análise" de "pendente" na etapa 1).
- Em `src/pages/Matricula.tsx`, substituir o bloco `<ol>` das linhas 277-292 por `<RoadmapEtapas />`, mantendo o cálculo de `etapaAtual` existente sem alteração.
- Estilos com tokens do design system (verde Zampieri já usado: `zampieri-green-dark`, `emerald-*`, `border`, `muted-foreground`) — sem cores hardcoded novas.
- Transição suave (`transition-all`) no preenchimento da linha e no destaque do marco atual.
- Sem mudanças em edge functions, banco ou lógica de upload/contrato/pagamento.
