/**
 * Guarda o id do produto no Tiny (`produtos.tiny_id`) — antes só existia em
 * memória durante a sincronização de catálogo, então sincronizar estoque
 * exigia re-percorrer o catálogo inteiro do Tiny (paginado) toda vez, o que
 * deixava a operação lenta e frágil (uma única requisição HTTP muito longa,
 * sujeita a timeout de proxy — ver correção que separa "importar catálogo"
 * de "sincronizar estoque" em lotes). Guardando o id uma vez, sincronizar
 * estoque depois vira só uma consulta direta por id, sem re-paginar.
 */

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE produtos ADD COLUMN tiny_id text;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE produtos DROP COLUMN IF EXISTS tiny_id;`);
};
