# Limpar dados de teste da Pré-matrícula

Objetivo: zerar os registros atuais para recomeçar os testes do fluxo de pré-matrícula/matrícula.

## O que existe hoje no banco

- Pré-matrículas: 2
- Agendamentos de entrevista: 1
- Códigos de verificação (OTP): 0
- Matrículas geradas: 1
- Documentos de matrícula: 9

## O que será apagado

Todos os registros acima, na ordem correta para respeitar os vínculos:

1. Documentos de matrícula
2. Matrículas
3. Agendamentos de entrevista
4. Códigos de verificação por WhatsApp
5. Pré-matrículas

## O que NÃO será tocado

- Regras e bloqueios da agenda (horários configurados continuam valendo)
- Dados de rematrícula 2027, eventos, produtos, ingressos e usuários administradores
- Arquivos já enviados no armazenamento (boletins, laudos, documentos). Se quiser, também removo esses arquivos — basta confirmar.

## Detalhes técnicos

Execução via ferramenta de dados (DELETE), sem alteração de schema:

```sql
DELETE FROM matricula_documentos;
DELETE FROM matriculas;
DELETE FROM prematricula_agendamentos;
DELETE FROM prematricula_otp;
DELETE FROM prematriculas;
```

Nenhum arquivo de código será alterado.
