export interface Fornecedor {
  id: string;
  nome: string;
  pais: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  contato_wechat: string | null;
  moeda_padrao: string;
  exige_pagamento_inicial: boolean;
  percentual_pagamento_inicial: number | null;
  layout_pedido: Record<string, unknown>;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export const PEDIDO_STATUS = [
  "rascunho",
  "enviado_fornecedor",
  "aguardando_pagamento_inicial",
  "em_producao",
  "embarcado",
  "aguardando_desembaraco",
  "em_desova",
  "conferencia",
  "finalizado",
  "cancelado",
] as const;
export type PedidoStatus = (typeof PEDIDO_STATUS)[number];

export interface Pedido {
  id: string;
  fornecedor_id: string;
  numero_referencia: string | null;
  status: PedidoStatus;
  moeda: string;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  observacoes: string | null;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  item_code: string | null;
  sku_interno: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  valor_total: number;
  atributos_extra: Record<string, unknown>;
  criado_em: string;
}

export const TIPOS_DOCUMENTO = [
  "invoice_proforma",
  "invoice_comercial",
  "comprovante_pagamento",
  "packing_list",
  "bl",
  "di",
  "nf_transferencia",
  "outro",
] as const;

export const FASES_DOCUMENTO = [
  "pedido",
  "pagamento_inicial",
  "producao",
  "embarque",
  "desembaraco",
  "transporte",
  "conferencia",
  "pagamento_final",
  "contabilidade",
] as const;

export interface PedidoDocumento {
  id: string;
  pedido_id: string;
  fase: (typeof FASES_DOCUMENTO)[number];
  tipo_documento: (typeof TIPOS_DOCUMENTO)[number];
  arquivo_url: string;
  storage_path: string;
  versao: number;
  enviado_por: string | null;
  enviado_em: string;
  observacoes: string | null;
}

export interface PedidoComDetalhes extends Pedido {
  itens: PedidoItem[];
  documentos: PedidoDocumento[];
}
