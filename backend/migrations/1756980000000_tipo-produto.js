/**
 * Classificação rolinho/placa — mesma regra do rtx-pedidos (src/routing/fornecedor.ts):
 * SKU canônico de 14 caracteres, "linha" nas posições 3-5; "605" é placa,
 * qualquer outra é rolinho. `produtos.tipo` é calculado a partir do SKU no
 * cadastro (decisão 17, minimizar digitação manual), mas fica editável pra
 * exceção. `fornecedores.tipo_produto_padrao` é o tipo esperado daquele
 * fornecedor — dado, não hardcoded no código (MVP_SCOPE.md: "nenhum
 * fornecedor hardcoded"). Ver DECISIONS.md, decisão 20.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE fornecedores ADD COLUMN tipo_produto_padrao text CHECK (tipo_produto_padrao IN ('rolinho', 'placa'));
    ALTER TABLE produtos ADD COLUMN tipo text CHECK (tipo IN ('rolinho', 'placa'));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE produtos DROP COLUMN tipo;
    ALTER TABLE fornecedores DROP COLUMN tipo_produto_padrao;
  `);
};
