/**
 * Módulo de decisão de compra (DECISIONS.md, decisões 12/15/16). Venda não
 * mora aqui — é lida do painel-gbw (ver src/repo/vendas-painel.ts).
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE produtos (
      sku text PRIMARY KEY,
      descricao text NOT NULL DEFAULT '',
      fornecedor_id uuid REFERENCES fornecedores(id),
      unidades_por_caixa numeric NOT NULL DEFAULT 1,
      custo_unit_usd numeric NOT NULL DEFAULT 0,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX produtos_fornecedor_id_idx ON produtos(fornecedor_id);

    CREATE TABLE estoque (
      sku text PRIMARY KEY REFERENCES produtos(sku) ON DELETE CASCADE,
      quantidade numeric NOT NULL DEFAULT 0,
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE em_transito (
      sku text PRIMARY KEY REFERENCES produtos(sku) ON DELETE CASCADE,
      quantidade numeric NOT NULL DEFAULT 0,
      observacoes text,
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE parametros (
      chave text PRIMARY KEY,
      valor text NOT NULL
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS parametros;
    DROP TABLE IF EXISTS em_transito;
    DROP TABLE IF EXISTS estoque;
    DROP TABLE IF EXISTS produtos;
  `);
};
