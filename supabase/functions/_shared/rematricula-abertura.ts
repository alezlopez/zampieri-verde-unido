// Abertura oficial da rematrícula 2027: 24/08/2026 00:00 (America/Sao_Paulo = UTC-3)
export const REMATRICULA_ABERTURA_ISO = "2026-08-24T00:00:00-03:00";

export const rematriculaLiberada = () =>
  Date.now() >= new Date(REMATRICULA_ABERTURA_ISO).getTime();
