/**
 * Regra de desconto da renegociação 2027 (mesma conta em supabase/functions/_shared/renegociacao-desconto.ts;
 * o servidor recalcula no checkout).
 * - Mais de 1 débito em aberto e paga TODOS juntos: 30% à vista, 10% parcelado.
 * - Paga só parte, ou tem apenas 1 débito: 15% à vista, parcelado pelo valor atualizado.
 */
export const regraDesconto = (abertos: number, selecionados: number) =>
  abertos > 1 && selecionados === abertos ? { avista: 30, parcelado: 10 } : { avista: 15, parcelado: 0 };

const r2 = (v: number) => Math.round(v * 100) / 100;

export const valoresRenegociacao = (totalAtualizado: number, abertos: number, selecionados: number) => {
  const regra = regraDesconto(abertos, selecionados);
  return {
    avista: r2(totalAtualizado * (1 - regra.avista / 100)),
    parcelado: r2(totalAtualizado * (1 - regra.parcelado / 100)),
    pctAvista: regra.avista,
    pctParcelado: regra.parcelado,
  };
};
