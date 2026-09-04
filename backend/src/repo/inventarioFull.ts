/**
 * Leitura do "Estoque Full" (unidades em centros de fulfillment — ML Full +
 * Shopee FBS + Amazon FBA) por SKU, direto da tabela `inventario_full` do
 * painel-gbw (mesmo projeto lido por `vendasPainel.ts`, decisão 15 do
 * DECISIONS.md — só leitura). Essa tabela é alimentada por um job do
 * `rtx-pedidos` (`src/sync/sync-inventario-full.ts`, projeto antigo, ainda em
 * produção — não portado aqui, só lido): soma ML+Shopee+Amazon por SKU
 * canônico, sem valor monetário nenhum — só quantidade (por isso a Decisão de
 * Compra não mostra "Valor Full", só "Estoque Full"). Tolerante: painel
 * ausente/tabela inexistente -> mapa vazio (SKU sem linha = sem dado, "—" na
 * tela, nunca 0 inventado).
 */
import { getPainelSql } from "./painelConexao.js";

export async function lerInventarioFull(): Promise<Map<string, number>> {
  const sql = getPainelSql();
  if (!sql) return new Map();

  try {
    const rows = await sql<{ sku: string; qtd: number }[]>`SELECT sku, qtd FROM inventario_full`;
    return new Map(rows.map((row) => [row.sku, Number(row.qtd)]));
  } catch {
    return new Map();
  }
}
