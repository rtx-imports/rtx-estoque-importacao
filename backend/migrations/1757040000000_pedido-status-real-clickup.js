/**
 * Substitui o enum de status "inventado" do MVP pelo pipeline REAL do
 * ClickUp da RTX (pedido de Beatriz, PDFs "ETAPAS IMPORTAÇÃO_CLICK UP" e
 * "MATRIZ_CHECK LIST ATUALIZADO"). 11 status reais + "cancelado" (não está
 * no ClickUp, mas é necessário operacionalmente — mantido à parte, como um
 * "Closed" alternativo).
 *
 * Mapeia os status antigos que já possam existir em pedidos criados durante
 * o MVP pro equivalente mais próximo do pipeline novo, antes de trocar a
 * constraint (senão a migration quebra com dado existente fora do enum novo).
 */

const MAPA_STATUS_ANTIGO_PARA_NOVO = {
  rascunho: "cotacao_proposta",
  enviado_fornecedor: "cotacao_proposta",
  aguardando_pagamento_inicial: "prod_iniciada_sem_pgto",
  em_producao: "prod_iniciada_pgto_ok",
  embarcado: "embarcado_em_transito",
  aguardando_desembaraco: "desembaraco_coleta",
  em_desova: "desova_agendada",
  conferencia: "armazenado",
  finalizado: "finalizado_financeiro",
  // 'cancelado' já existe nos dois enums, não precisa mapear.
};

export const up = (pgm) => {
  // Solta a constraint ANTES de trocar os valores — senão o UPDATE pro status
  // novo já viola a constraint antiga antes dela ser trocada.
  pgm.sql(`ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;`);
  for (const [antigo, novo] of Object.entries(MAPA_STATUS_ANTIGO_PARA_NOVO)) {
    pgm.sql(`UPDATE pedidos SET status = '${novo}' WHERE status = '${antigo}';`);
  }
  pgm.sql(`
    ALTER TABLE pedidos ALTER COLUMN status SET DEFAULT 'cotacao_proposta';
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check CHECK (status IN (
      'cotacao_proposta', 'prod_iniciada_sem_pgto', 'prod_iniciada_pgto_ok',
      'prod_finalizada_pre_embarque', 'relatorio_embarques', 'embarcado_em_transito',
      'em_santos', 'desembaraco_coleta', 'desova_agendada', 'armazenado',
      'finalizado_financeiro', 'cancelado'
    ));

    ALTER TABLE pedido_checklist_itens ADD COLUMN grupo text;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE pedido_checklist_itens DROP COLUMN IF EXISTS grupo;
    ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
    ALTER TABLE pedidos ALTER COLUMN status SET DEFAULT 'rascunho';
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check CHECK (status IN (
      'rascunho', 'enviado_fornecedor',
      'aguardando_pagamento_inicial', 'em_producao', 'embarcado',
      'aguardando_desembaraco', 'em_desova', 'conferencia',
      'finalizado', 'cancelado'
    ));
  `);
};
