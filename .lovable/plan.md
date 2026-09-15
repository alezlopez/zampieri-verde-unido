# Vagas: matrículas ocupando o controle e lista de espera

## Como vai funcionar

O controle de vagas passa a ser a fonte única de ocupação das turmas de 2027, somando rematrículas e matrículas de alunos novos, com prioridade garantida para a rematrícula.

**No controle de vagas (/admin/vagas), cada turma (curso + turno) ganha:**

- Interruptor **"Aberta para matrícula"** (liga/desliga a entrada de alunos novos).
- Campo **"Vagas liberadas para novos"** — quantas das vagas da turma podem ser ocupadas por alunos novos. O restante fica reservado para rematrícula.
- Colunas separadas de ocupação: **Rematrícula**, **Matrículas**, **Total**, **Livres**, e **Livres para novos**.

```text
Curso                        Turno  Máx  Remat  Matr  Livres  Novos: libera/usadas/restam  Aberta
Ens. Fund. I - 1º Ano        Manhã   25    18     3      4            5 / 3 / 2             [x]
Ens. Fund. I - 1º Ano        Tarde   50    31     0     19            0 / 0 / 0             [ ]
```

**Quem ocupa vaga:** alunos de rematrícula com turno escolhido, e matrículas criadas após a entrevista (enquanto não forem canceladas ou marcadas como desistentes). Pré-matrícula **não** segura vaga.

**Na pré-matrícula (/prematricula):**

- Aviso explícito na etapa do aluno: *"O envio da pré-matrícula não reserva vaga. A vaga só é garantida na matrícula."*
- Ao escolher série e turno, o sistema consulta a disponibilidade em tempo real e mostra em cada turno: "Vagas disponíveis", "Sem vagas — lista de espera" ou "Turma fechada para matrícula — lista de espera".
- Sem vaga, a família **pode enviar assim mesmo**: a pré-matrícula é marcada como lista de espera, com aviso na tela de conclusão e na mensagem enviada.

**Lista de espera:**

- Registro próprio por aluno (série, turno, data de entrada, posição por ordem de chegada, status: aguardando, convocado, convertido, desistente).
- Nova aba **"Lista de espera"** no painel de pré-matrículas: filtro por série/turno, posição na fila, botão "Convocar" (registra a convocação e avisa a família pelo WhatsApp com o texto de convocação) e botão "Remover da fila" com motivo.
- Quando uma vaga é liberada (matrícula cancelada/desistente ou aumento do limite), a secretaria vê um aviso no sino indicando a turma e quantas famílias aguardam.

## Detalhes técnicos

**Banco**
- `vagas_2027`: novas colunas `matricula_habilitada boolean not null default false` e `vagas_novos integer not null default 0`.
- Função `public.curso_2027_por_serie(text)` (imutável) mapeando as séries da pré-matrícula (`Infantil 5 (Pré-Escola)`, `1º ano`, … `3ª série do Ensino Médio`) para os nomes de `vagas_2027.curso_2027` (`Educação Infantil - Pré`, `Ensino Fundamental I - 1º Ano`, …), mais normalização de turno (minúsculas/sem acento).
- Nova view/função de ocupação usada por todas as telas: rematrículas (`alunos_rematricula_2027.curso_2027` + `turno_escolhido`, excluindo canceladas) + matrículas (`matriculas.curso` + `turno` via mapeamento, excluindo `acompanhamento` cancelado/desistente).
- `rematricula_2027_turnos` e `rematricula_2027_admin_vagas` atualizadas para usar a nova ocupação e devolver as colunas novas.
- Nova RPC pública `prematricula_vagas_turnos(p_serie text)` (SECURITY DEFINER, STABLE): por turno retorna `matricula_habilitada`, `vagas_novos`, `usadas_novos`, `restam_novos`, `lista_espera` (bool). Executável por `anon`.
- Nova tabela `lista_espera_2027` (`prematricula_id`, `serie`, `curso_2027`, `turno`, `status`, `posicao` por ordem de `created_at`, `convocado_em`, `motivo_saida`), com GRANTs e RLS: leitura/gestão apenas para o setor `matricula`; inserção via edge function (service role).
- Trigger de notificação (`notificar_admin`) quando uma turma volta a ter vaga com fila aguardando.

**Edge functions**
- `prematricula-enviar`: ao gravar a pré-matrícula, revalida a disponibilidade no servidor e cria o registro na lista de espera quando não houver vaga; inclui o aviso no texto enviado.
- `prematricula-admin-acao`: novas ações `lista_espera_convocar` e `lista_espera_remover`; ao concluir a matrícula, marca a fila como convertida.
- `matricula-admin`: ao cancelar/marcar desistente, a vaga volta automaticamente (a ocupação é calculada, não armazenada).

**Frontend**
- `src/pages/AdminVagas.tsx`: colunas e edição inline dos dois campos novos, totais separados por origem.
- `src/components/prematricula/Etapas.tsx` / `Campos.tsx`: aviso fixo, consulta de disponibilidade por série e rótulo por turno.
- `src/pages/PreMatriculaAdmin.tsx`: aba Lista de espera com fila, convocação e saída.

## Fora do escopo
- Mudanças no fluxo de pagamento, contratos ou nas fases da rematrícula.
- Tabela antiga `vagas_turmas` (ciclo 2026).
