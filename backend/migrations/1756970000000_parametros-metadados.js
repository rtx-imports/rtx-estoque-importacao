/**
 * Registra quando cada parâmetro foi ajustado manualmente pela última vez —
 * usado pela tela pra avisar quando o câmbio (cotação comparada entre
 * Santander e Banco do Brasil) está desatualizado. Ver DECISIONS.md.
 */

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE parametros ADD COLUMN atualizado_em timestamptz NOT NULL DEFAULT now();`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE parametros DROP COLUMN atualizado_em;`);
};
