## Diagnóstico

Verifiquei o banco. O ingresso do teste (CPF pai 37119355830, evento "Festa Junina", aluno 2717) foi inserido às **23:35:58** com `cortesia=false` e `valor_total=15`. Mas o evento só foi atualizado com `aluno_cortesia=true` às **23:54:37** — ou seja, o teste foi feito **antes** de salvar o toggle. Por isso o aluno foi somado.

A lógica atual em `EventoCompra.tsx` está correta (`alunoCortesia = !!evento?.aluno_cortesia` exclui o aluno do total e marca `cortesia=true` no insert). O problema é que ela depende do `evento` carregado em estado, que pode ficar desatualizado se o admin alterar o toggle enquanto a página de compra estiver aberta em outra aba/sessão.

## Plano (1 mudança defensiva, sem afetar fluxo)

Em `src/pages/EventoCompra.tsx`, no `handleComprar` (linha ~414): a query que já refaz `vagas_disponiveis` passa a buscar também `aluno_cortesia`. Esse valor fresco é usado em vez de `evento.aluno_cortesia` para:

- decidir `cortesia: true` e `valor_total: 0` no insert dos alunos
- decidir `status: "pago"` para alunos cortesia
- recalcular o total final caso a flag tenha mudado entre o load da página e o clique

```ts
const { data: eventoAtual } = await supabase
  .from("eventos")
  .select("vagas_disponiveis, aluno_cortesia")
  .eq("id", evento.id)
  .single();

const alunoCortesiaFresh = !!eventoAtual?.aluno_cortesia;
// usar alunoCortesiaFresh nas linhas 467, 478, 479, 486, 487
```

Nada muda no UI, no checkout Asaas, nas RLS, na edge function, no webhook ou em ingressos já existentes. Apenas garante que o estado mais recente do evento é usado no momento do insert.

## Próximo passo do teste

Após implementar, faça novo teste com o mesmo CPF. Como `aluno_cortesia` agora está `true` no banco, o aluno será inserido com `cortesia=true`, `valor_total=0`, `status=pago`, e ficará fora do checkout Asaas (apenas os 2 convidados a R$30 vão para pagamento).
