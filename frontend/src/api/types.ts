/** Sugestão automática pelo SKU (classificarTipoPorSku) — só cobre esses dois. */
export type TipoProdutoSugerido = "rolinho" | "placa";

/** Um tipo de produto cadastrado (tela de cadastro dinâmico). */
export interface TipoProdutoCadastrado {
  nome: string;
  criado_em: string;
}

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
  /** Tipos de produto (tipos_produto.nome) que este fornecedor vende — pode ser mais de um. */
  tipos_produto: string[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Pipeline real do ClickUp da RTX (PDFs "ETAPAS IMPORTAÇÃO_CLICK UP" e
 * "MATRIZ_CHECK LIST ATUALIZADO") — não é mais um enum "inventado" do MVP.
 * "cancelado" não está no ClickUp mas é necessário operacionalmente.
 */
export const PEDIDO_STATUS = [
  "cotacao_proposta",
  "prod_iniciada_sem_pgto",
  "prod_iniciada_pgto_ok",
  "prod_finalizada_pre_embarque",
  "relatorio_embarques",
  "embarcado_em_transito",
  "em_santos",
  "desembaraco_coleta",
  "desova_agendada",
  "armazenado",
  "finalizado_financeiro",
  "cancelado",
] as const;
export type PedidoStatus = (typeof PEDIDO_STATUS)[number];

export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  cotacao_proposta: "Cotação/Proposta",
  prod_iniciada_sem_pgto: "Prod. Iniciada (sem pgto)",
  prod_iniciada_pgto_ok: "Prod. Iniciada (pgto OK)",
  prod_finalizada_pre_embarque: "Prod. Finalizada/Pré-Embarque",
  relatorio_embarques: "Relatório de Embarques",
  embarcado_em_transito: "Embarcado – Em Trânsito",
  em_santos: "Em Santos",
  desembaraco_coleta: "Desembaraço/Coleta",
  desova_agendada: "Desova Agendada",
  armazenado: "Armazenado",
  finalizado_financeiro: "Finalizado Financeiro",
  cancelado: "Cancelado",
};

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

export interface PedidoChecklistItem {
  id: string;
  pedido_id: string;
  descricao: string;
  grupo: string | null;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
  criado_em: string;
}

export interface PedidoComDetalhes extends Pedido {
  itens: PedidoItem[];
  documentos: PedidoDocumento[];
  checklist: PedidoChecklistItem[];
}

export interface Produto {
  sku: string;
  descricao: string;
  unidades_por_caixa: number;
  custo_unit_usd: number;
  /** Referencia tipos_produto.nome — cadastro dinâmico, não fica restrito a rolinho/placa. */
  tipo: string | null;
  /** Client code (ex. "DG3111G") — distinto do sku canônico interno. */
  item_code: string | null;
  /** NCM — agrupa linhas na grade da Decisão de Compra. */
  ncm: string | null;
  /** Estoque atual (tabela `estoque`) — null quando o SKU nunca foi sincronizado
   * com o Tiny (distinto de 0, que é confirmado zero). */
  estoque: number | null;
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
  estoqueCriticoDias: number;
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
  tipoSugerido: TipoProdutoSugerido | null;
}

export interface ResultadoBuscaTiny {
  produtos: TinyProduto[];
  pagina: number;
  totalPaginas: number;
}

export interface ResultadoImportacaoCatalogoTiny {
  totalNoTiny: number;
  classificados: number;
  naoClassificados: number;
  importados: number;
  jaExistiam: number;
  tinyIdPreenchido: number;
  custoPreenchido: number;
}

/** Um lote de POST /produtos/sincronizar-estoque — chamado repetidamente pelo
 * front (passando `proximoCursor` de volta como `cursor`) até vir null. */
export interface ResultadoLoteEstoque {
  processados: number;
  atualizados: number;
  falhas: number;
  /** true = o lote parou cedo porque o Tiny bloqueou por rate limit (não é
   * uma falha comum) — vale esperar mais antes de tentar o próximo lote. */
  bloqueado: boolean;
  proximoCursor: string | null;
  totalElegiveis: number;
}

export type AcabaTipo = "mes" | "semgiro" | "acima12";
export type AbcClass = "A" | "B" | "C";
export type XyzClass = "X" | "Y" | "Z";

export interface PropostaItem {
  sku: string;
  descricao: string;
  /** Client code (produtos.item_code) — null quando não cadastrado. */
  itemCode: string | null;
  /** NCM (produtos.ncm) — agrupa linhas na grade; null = sem grupo. */
  ncm: string | null;
  tipo: string | null;
  demandaPicoMensal: number;
  /** Estoque físico total (Full + Cross). */
  estoque: number;
  /** Unidades em centros de fulfillment (ML Full/Shopee FBS/Amazon FBA) — null sem dado. */
  estoqueFull: number | null;
  /** estoque − estoqueFull (nunca negativo) — estoque fora do Full. null se estoqueFull for null. */
  estoqueCross: number | null;
  transito: number;
  unidadesPorCaixa: number;
  custoUnitUsd: number;
  custoAtualUsd: number;
  custoTransitoUsd: number;
  widthM: number | null;
  lengthM: number | null;
  /** Plano de compra dos próximos 7 meses (índice 0 = mês atual). */
  plan: number[];
  acabaMeses: number | null;
  acabaTipo: AcabaTipo;
  diasEstoqueAtual: number | null;
  /** Dias até a ruptura considerando estoque + trânsito — null sem giro. */
  diasRestantes: number | null;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
  valorFinanceiroUsd: number;
  classeAbc: AbcClass;
  coefVariacao: number | null;
  classeXyz: XyzClass;
}

export interface PropostaKpis {
  totalSugeridoUsd: number;
  totalSugeridoBrl: number;
  produtosCriticos: number;
  rupturasPrevistas: number;
  saudeEstoquePct: number;
  coberturaMediaDias: number | null;
}

export interface Proposta {
  fornecedor_id: string;
  params: Parametros;
  /** Só quem precisa de atenção agora (grade principal) — ver `itensTodos` p/ o catálogo inteiro. */
  itens: PropostaItem[];
  /** Catálogo inteiro do fornecedor (inclusive quem não precisa comprar agora) — Curva ABC/XYZ. */
  itensTodos: PropostaItem[];
  totais: { necessidade: number; custoUsd: number; custoBrl: number };
  kpis: PropostaKpis;
}

export interface SimulacaoParametros {
  leadTimeDias?: number;
  coberturaMinimaMeses?: number;
  crescimentoMensal?: number;
  cambio?: number;
  janelaMeses?: number;
  estoqueCriticoDias?: number;
}
