export type TipoProduto = "rolinho" | "placa";

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
  tipo_produto_padrao: TipoProduto | null;
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

export interface Produto {
  sku: string;
  descricao: string;
  fornecedor_id: string | null;
  unidades_por_caixa: number;
  custo_unit_usd: number;
  tipo: TipoProduto | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Parametros {
  leadTimeDias: number;
  coberturaMinimaMeses: number;
  crescimentoMensal: number;
  cambio: number;
  janelaMeses: number;
}

export interface PtaxReferencia {
  valor: number;
  data: string; // "YYYY-MM-DD"
}

export interface ParametrosComMetadados extends Parametros {
  cambioAtualizadoEm: string | null;
  ptaxReferencia: PtaxReferencia | null;
}

export interface TinyProduto {
  sku: string;
  nome: string;
  tinyId: string;
  unidade: string;
  situacao: string;
  tipoSugerido: TipoProduto | null;
}

export type AcabaTipo = "mes" | "semgiro" | "acima12";

export interface PropostaItem {
  sku: string;
  descricao: string;
  tipo: TipoProduto | null;
  demandaPicoMensal: number;
  estoque: number;
  transito: number;
  unidadesPorCaixa: number;
  custoUnitUsd: number;
  /** Plano de compra dos próximos 7 meses (índice 0 = mês atual). */
  plan: number[];
  acabaMeses: number | null;
  acabaTipo: AcabaTipo;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
}

export interface Proposta {
  fornecedor_id: string;
  params: Parametros;
  itens: PropostaItem[];
  totais: { necessidade: number; custoUsd: number; custoBrl: number };
}
