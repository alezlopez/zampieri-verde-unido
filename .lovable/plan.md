## Objetivo

Criar a rota pública `/rematricula2027` com um fluxo guiado (wizard) que localiza o aluno na tabela `alunos_rematricula_2027`, confirma identidade, completa/atualiza os dados de aluno, mãe e pai, e finaliza com a escolha de curso/turno/responsável financeiro e exibição dos valores.

## Estado atual verificado

- `alunos_rematricula_2027` tem 747 registros, RLS ativo e **nenhuma policy** — hoje é inacessível pelo frontend. Todo acesso terá que passar por funções seguras no banco (`SECURITY DEFINER`).
- Não existe coluna de telefone do aluno: a busca por telefone usará `celular_pai` e `celular_mae`; a busca por CPF usará `cpf_pai`, `cpf_mae` e `cpf_aluno`.
- 459 de 747 alunos têm `cpf_aluno`; `turno_escolhido` e `responsavel_financeiro` estão 100% vazios (serão preenchidos por este fluxo).
- 14 valores distintos de `curso_2027` (incluindo 24 registros com curso vazio).
- A tabela `vagas_2027` **ainda não existe**. Conforme sua resposta, você vai criar/importar. O código vai ler `curso_2027`, `turno`, `max_vagas`, `ativo` e tratar ausência de linha como "turno indisponível", sem quebrar a tela.

## Fluxo

```text
Tela 0  Buscar: telefone (11996525783) ou CPF (371193558-30)
   |
   +-- 0 resultados -> mensagem + contato WhatsApp
   +-- 1+ resultados -> lista de alunos para escolher
   |
Tela 0b Confirmar data de nascimento do aluno (libera os dados)
   |
Tela 1  Dados do aluno   (nome, nascimento, CPF ou "aluno não possui CPF")
Tela 2  Dados da mãe     (campos vazios obrigatórios)
Tela 3  Dados do pai     (campos vazios obrigatórios)
Tela 4  Curso 2027 + turno (com vagas) + valores + responsável financeiro
   |
Confirmação final -> grava tudo e mostra tela de sucesso
```

Barra de progresso "Etapa X de 4", botões Voltar/Continuar, validação por etapa com zod, dados mantidos em estado até o envio final.

## Banco de dados (migration)

**1. Nova tabela `rematricula_valores_2027`** — valor da rematrícula por curso, fácil de alterar:

| coluna | uso |
|---|---|
| `curso_2027` | chave de ligação com o aluno |
| `valor_rematricula` | valor cheio |
| `valor_promocional` | valor de campanha (opcional; quando preenchido, é o que vale) |
| `promocao_ate` | data limite da campanha (opcional) |
| `ativo` | liga/desliga a linha |

Populada com os 13 cursos existentes e valor inicial 0,00 para você ajustar depois.

**2. Funções seguras (`SECURITY DEFINER`)** — o frontend nunca lê a tabela diretamente:

- `rematricula_2027_buscar(p_termo)` — recebe telefone ou CPF (normaliza dígitos) e devolve **apenas** `id_aluno`, `nome_aluno` e `curso_atual`. Nenhum dado sensível nesta etapa.
- `rematricula_2027_abrir(p_id_aluno, p_data_nascimento)` — só devolve o cadastro completo se a data de nascimento informada bater. Junta o valor da rematrícula vindo de `rematricula_valores_2027`.
- `rematricula_2027_turnos(p_curso_2027)` — lê `vagas_2027`, conta quantos já escolheram cada turno em `alunos_rematricula_2027` e devolve turno + vagas restantes + disponível sim/não.
- `rematricula_2027_salvar(p_id_aluno, p_data_nascimento, ...campos...)` — revalida a data de nascimento, revalida a vaga do turno escolhido (evita estouro por concorrência) e grava os campos de aluno/mãe/pai + `turno_escolhido` + `responsavel_financeiro`.

Acesso concedido ao papel anônimo apenas nessas funções; a tabela continua sem policies.

## Frontend

- `src/pages/Rematricula2027.tsx` — página container com o estado do wizard.
- `src/components/rematricula/` — um componente por etapa (`StepBusca`, `StepIdentidade`, `StepAluno`, `StepMae`, `StepPai`, `StepCurso`, `StepSucesso`), mantendo cada arquivo pequeno.
- Rota registrada em `src/App.tsx` acima do catch-all.
- Visual seguindo a identidade existente (tons de verde, `logo-zampieri.png`, cabeçalho simples), responsivo e mobile-first.
- Máscaras de CPF/telefone/CEP, busca de endereço por CEP via ViaCEP, e datepicker para nascimento.
- Campos já preenchidos vêm bloqueados como somente-leitura com opção "corrigir"; campos vazios são obrigatórios.
- Na tela do aluno, o botão **"Aluno não possui CPF"** dispensa a obrigatoriedade do CPF.
- Na tela 4: curso 2027 (somente leitura), seletor de turno com contagem de vagas (turnos esgotados desabilitados), cartão com mensalidade cheia, desconto, mensalidade final, dia de vencimento e valor da rematrícula, e escolha do responsável financeiro (pai/mãe — só aparecem os que existem no cadastro).

## Detalhes técnicos

- Comparação de CPF e telefone feita por dígitos apenas (`regexp_replace`), pois a base tem formatos mistos (`371193558-30`).
- `tem_pai`/`tem_mae` = "não" oculta a etapa correspondente.
- Alunos com `curso_2027` vazio (24 registros) veem uma mensagem pedindo contato com a secretaria em vez do formulário de curso.
- Escrita idempotente: reabrir o link e salvar de novo atualiza o mesmo registro.

## Fora deste escopo (fases futuras já mapeadas)

- Assinatura de contrato via ZapSign.
- Pagamento da rematrícula via Asaas (reaproveitando as edge functions de checkout já existentes).
- Painel administrativo de acompanhamento.

Ambos ficam mais simples depois desta base, porque o registro já terá turno, responsável financeiro e valor definidos.
