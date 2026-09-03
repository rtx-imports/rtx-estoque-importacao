/**
 * Cadastro dinâmico de tipos de produto (pedido de Beatriz: "cadastrar tipos
 * de produtos em algum lugar") — antes hardcoded como CHECK ('rolinho',
 * 'placa'). Vira uma tabela: seed com os 2 valores atuais (mesmos que
 * `classificarTipoPorSku` continua produzindo automaticamente — tipo novo
 * cadastrado aqui exige atribuição manual, não tem regra de SKU).
 *
 * Fornecedor deixa de ter só UM tipo padrão (`tipo_produto_padrao`) — vira
 * N:N via `fornecedor_tipos_produto` (um fornecedor pode vender vários
 * tipos). Migra o valor único existente para a nova tabela antes de derrubar
 * a coluna.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE tipos_produto (
      nome text PRIMARY KEY,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO tipos_produto (nome) VALUES ('rolinho'), ('placa');

    CREATE TABLE fornecedor_tipos_produto (
      fornecedor_id uuid NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
      tipo_produto text NOT NULL REFERENCES tipos_produto(nome) ON DELETE RESTRICT,
      PRIMARY KEY (fornecedor_id, tipo_produto)
    );
    INSERT INTO fornecedor_tipos_produto (fornecedor_id, tipo_produto)
      SELECT id, tipo_produto_padrao FROM fornecedores WHERE tipo_produto_padrao IS NOT NULL;

    ALTER TABLE fornecedores DROP COLUMN tipo_produto_padrao;

    ALTER TABLE produtos DROP CONSTRAINT produtos_tipo_check;
    ALTER TABLE produtos ADD CONSTRAINT produtos_tipo_fkey FOREIGN KEY (tipo) REFERENCES tipos_produto(nome);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE produtos DROP CONSTRAINT produtos_tipo_fkey;
    ALTER TABLE produtos ADD CONSTRAINT produtos_tipo_check CHECK (tipo IN ('rolinho', 'placa'));

    ALTER TABLE fornecedores ADD COLUMN tipo_produto_padrao text CHECK (tipo_produto_padrao IN ('rolinho', 'placa'));
    UPDATE fornecedores f SET tipo_produto_padrao = (
      SELECT tipo_produto FROM fornecedor_tipos_produto WHERE fornecedor_id = f.id LIMIT 1
    );

    DROP TABLE fornecedor_tipos_produto;
    DROP TABLE tipos_produto;
  `);
};
