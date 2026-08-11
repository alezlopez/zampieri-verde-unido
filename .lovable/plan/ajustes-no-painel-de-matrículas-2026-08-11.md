# Ajustes no painel de Matrículas

Quatro melhorias na área administrativa de matrículas.

## 1. Voltar ao painel com permissão "matricula"

Hoje quem tem apenas o setor "matricula" nunca vê o painel: ao abrir `/admin` o sistema redireciona automaticamente para a primeira tela do setor (pré-matrículas), então "Matrículas em andamento" e "Agenda da entrevista" ficam inacessíveis.

Correção: o redirecionamento automático passa a acontecer só quando o setor tem uma única tela (ex.: portaria). Setores com mais de um atalho — como matrícula — abrem o painel normalmente, com os três cards visíveis, e o botão flutuante "Painel Admin" continua levando de volta.

## 2. Botão de liberar contrato no fim da tela

O botão "Liberar contrato" sai do bloco de documentos e vai para o fim do dialog, logo abaixo do bloco de valores:

- Barra final destacada, largura total, com o resumo do que falta.
- Fica cinza/desabilitado enquanto documentos ou valores estiverem pendentes, com o texto do que falta.
- Fica verde e habilitado assim que os documentos estiverem aprovados e os valores salvos: "Liberar contrato para a família preencher".
- Depois de liberado, mostra confirmação de que a família já pode preencher (sem repetir a ação).

O bloco de documentos mantém apenas "Aprovar toda a documentação" e "Solicitar reenvio".

## 3. Documentos travados após a assinatura

Quando o contrato já estiver assinado, os botões "Aprovar", "Rejeitar", "Aprovar toda a documentação" e "Solicitar reenvio" ficam desabilitados, com aviso "Contrato já assinado — documentação encerrada". A visualização ("Ver") continua disponível. O bloqueio também é aplicado no servidor, para não depender só da tela.

## 4. Anuidade por dropdown

Os campos "Anuidade total" e "Anuidade total por extenso" viram um único seletor com as opções:

| Curso | Valor | Por extenso |
| --- | --- | --- |
| Pré | 19.500,00 | Dezenove mil e quinhentos reais |
| 1º Ano | 11.570,00 | Onze mil quinhentos e setenta reais |
| 2º ao 5º Ano | 13.000,00 | Treze mil reais |
| 6º ao 9º Ano | 14.430,00 | Quatorze mil quatrocentos e trinta reais |
| Ensino Médio | 14.950,00 | Quatorze mil novecentos e cinquenta reais |

Ao escolher, os dois campos são preenchidos automaticamente. Existe a opção "Outro (digitar)" que reabre os dois campos livres, para casos fora da tabela. Se a matrícula já tiver um valor salvo que não bate com a tabela, ela abre em modo "Outro".

## Detalhes técnicos

- `src/pages/AdminHome.tsx`: redirecionar apenas quando `visiveis.length === 1 && visiveis[0].itens.length === 1`.
- `src/pages/MatriculaAdmin.tsx`:
  - mover o botão `liberar_dados` para uma seção final; estilo verde quando `docsConferidos && valoresProntos`, cinza caso contrário; mensagens de pendência junto ao botão.
  - novo booleano `documentosTravados = aberta.contrato_assinado` desabilitando as ações de documento.
  - nova constante `ANUIDADES` (valor + extenso) e um `Select` que grava em `form.anuidade_total` / `form.anuidade_total_ext`; modo "outro" mantém os `Input`s atuais.
- `supabase/functions/matricula-admin/index.ts`: em `doc_status`, `aprovar_documentos` e `solicitar_reenvio`, retornar erro `contrato_assinado` quando `mat.contrato_assinado` for verdadeiro.
