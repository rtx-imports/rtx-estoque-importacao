/**
 * Checklist livre por pedido (pedido de Beatriz — espelha o que hoje é feito
 * no ClickUp). Itens de texto livre, não uma matriz fixa por fase: ela ainda
 * vai mandar a matriz real depois (por fornecedor ou geral); até lá, dá pra
 * adicionar/marcar itens à mão em cada pedido. Quando a matriz chegar, um
 * próximo passo pode ser gerar os itens automaticamente ao criar o pedido —
 * o schema já suporta isso (`ordem` já existe pra manter a ordem de um
 * template).
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE pedido_checklist_itens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      descricao text NOT NULL,
      concluido boolean NOT NULL DEFAULT false,
      concluido_em timestamptz,
      ordem integer NOT NULL DEFAULT 0,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX pedido_checklist_itens_pedido_id_idx ON pedido_checklist_itens(pedido_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS pedido_checklist_itens;`);
};
