/**
 * Schema completo do módulo de Pedido + tabelas reservadas para fases
 * futuras (pedido_fase_status, nf_transferencia), conforme DATA_MODEL.md —
 * criadas agora para evitar migração disruptiva quando essas fases entrarem,
 * mas não usadas pelo MVP.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      email text NOT NULL UNIQUE,
      senha_hash text NOT NULL,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE fornecedores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      pais text,
      contato_nome text,
      contato_email text,
      contato_telefone text,
      contato_wechat text,
      moeda_padrao text NOT NULL DEFAULT 'USD',
      exige_pagamento_inicial boolean NOT NULL DEFAULT false,
      percentual_pagamento_inicial numeric(5,2),
      layout_pedido jsonb NOT NULL DEFAULT '{}'::jsonb,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT percentual_pagamento_inicial_range
        CHECK (percentual_pagamento_inicial IS NULL
          OR (percentual_pagamento_inicial >= 0 AND percentual_pagamento_inicial <= 100))
    );

    CREATE TABLE pedidos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
      numero_referencia text,
      status text NOT NULL DEFAULT 'rascunho',
      moeda text NOT NULL DEFAULT 'USD',
      criado_por uuid REFERENCES usuarios(id),
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      observacoes text,
      CONSTRAINT pedidos_status_check CHECK (status IN (
        'rascunho', 'enviado_fornecedor',
        'aguardando_pagamento_inicial', 'em_producao', 'embarcado',
        'aguardando_desembaraco', 'em_desova', 'conferencia',
        'finalizado', 'cancelado'
      ))
    );
    CREATE INDEX pedidos_fornecedor_id_idx ON pedidos(fornecedor_id);

    CREATE TABLE pedido_itens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      item_code text,
      sku_interno text,
      descricao text NOT NULL,
      quantidade numeric NOT NULL,
      unidade text NOT NULL,
      preco_unitario numeric NOT NULL,
      valor_total numeric NOT NULL,
      atributos_extra jsonb NOT NULL DEFAULT '{}'::jsonb,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX pedido_itens_pedido_id_idx ON pedido_itens(pedido_id);

    CREATE TABLE pedido_documentos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      fase text NOT NULL DEFAULT 'pedido',
      tipo_documento text NOT NULL,
      arquivo_url text NOT NULL,
      storage_path text NOT NULL,
      versao integer NOT NULL DEFAULT 1,
      enviado_por uuid REFERENCES usuarios(id),
      enviado_em timestamptz NOT NULL DEFAULT now(),
      observacoes text,
      CONSTRAINT pedido_documentos_fase_check CHECK (fase IN (
        'pedido', 'pagamento_inicial', 'producao', 'embarque',
        'desembaraco', 'transporte', 'conferencia', 'pagamento_final',
        'contabilidade'
      )),
      CONSTRAINT pedido_documentos_tipo_check CHECK (tipo_documento IN (
        'invoice_proforma', 'invoice_comercial', 'comprovante_pagamento',
        'packing_list', 'bl', 'di', 'nf_transferencia', 'outro'
      ))
    );
    CREATE INDEX pedido_documentos_pedido_id_idx ON pedido_documentos(pedido_id);

    -- Reservado: não populado pelo MVP (módulo de Pedido).
    CREATE TABLE pedido_fase_status (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      fase text NOT NULL,
      responsavel_id uuid REFERENCES usuarios(id),
      status text NOT NULL,
      data_prevista date,
      data_real date,
      observacoes text
    );
    CREATE INDEX pedido_fase_status_pedido_id_idx ON pedido_fase_status(pedido_id);

    -- Reservado: fase futura, fora do MVP.
    CREATE TABLE nf_transferencia (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pedido_id uuid NOT NULL REFERENCES pedidos(id),
      empresa_origem text NOT NULL DEFAULT 'RTX',
      empresa_destino text NOT NULL,
      numero_nf text,
      valor numeric,
      data_emissao date,
      status text
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS nf_transferencia;
    DROP TABLE IF EXISTS pedido_fase_status;
    DROP TABLE IF EXISTS pedido_documentos;
    DROP TABLE IF EXISTS pedido_itens;
    DROP TABLE IF EXISTS pedidos;
    DROP TABLE IF EXISTS fornecedores;
    DROP TABLE IF EXISTS usuarios;
  `);
};
