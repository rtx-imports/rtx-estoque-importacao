/**
 * Produto deixa de pertencer a um fornecedor — vira catálogo (SKU + tipo),
 * sem fornecedor fixo. A escolha do fornecedor passa a acontecer só na hora
 * de gerar o pedido/planilha (resolvida via fornecedores.tipo_produto_padrao,
 * decisão 20). Pedido de Beatriz. Ver DECISIONS.md.
 */

export const up = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS produtos_fornecedor_id_idx;
    ALTER TABLE produtos DROP COLUMN fornecedor_id;
    CREATE INDEX produtos_tipo_idx ON produtos(tipo);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS produtos_tipo_idx;
    ALTER TABLE produtos ADD COLUMN fornecedor_id uuid REFERENCES fornecedores(id);
    CREATE INDEX produtos_fornecedor_id_idx ON produtos(fornecedor_id);
  `);
};
