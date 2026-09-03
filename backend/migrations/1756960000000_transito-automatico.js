/**
 * "Em trânsito" deixa de ser digitado manualmente — passa a ser derivado dos
 * próprios pedidos (soma dos itens de pedidos cujo status está entre
 * embarcado e antes de finalizado). Menos digitação manual, menos chance de
 * erro (decisão de Beatriz). Ver DECISIONS.md.
 */

export const up = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS em_transito;`);
};

export const down = (pgm) => {
  pgm.sql(`
    CREATE TABLE em_transito (
      sku text PRIMARY KEY REFERENCES produtos(sku) ON DELETE CASCADE,
      quantidade numeric NOT NULL DEFAULT 0,
      observacoes text,
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
};
