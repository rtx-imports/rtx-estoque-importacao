/**
 * Colunas que faltavam pra grade da Decisão de Compra bater com a planilha de
 * referência da RTX: `item_code` (código do fornecedor, ex. "DG3111G" — hoje
 * só tínhamos `sku` canônico, ex. "02105BRABRI50C") e `ncm` (usado pra
 * agrupar linhas na grade, mesmo padrão de bloco por NCM do `rtx-pedidos`).
 * Ambos nullable e opcionais — não inventa dado, só abre o campo pra digitar.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE produtos ADD COLUMN item_code text;
    ALTER TABLE produtos ADD COLUMN ncm text;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE produtos DROP COLUMN IF EXISTS item_code;
    ALTER TABLE produtos DROP COLUMN IF EXISTS ncm;
  `);
};
