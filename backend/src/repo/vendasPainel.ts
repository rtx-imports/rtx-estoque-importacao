import { getPainelSql } from "./painelConexao.js";

/**
 * Leitura de vendas mensais do painel-gbw — só leitura, nunca escreve lá.
 * Módulo único que conhece essa conexão (DECISIONS.md, decisão 15): o resto
 * do código só chama `lerVendasMensais`, então trocar a fonte depois é
 * mudar só este arquivo. Tolerante: sem PAINEL_DATABASE_URL configurada,
 * devolve série vazia em vez de quebrar (útil pra dev sem credencial).
 */

export interface VendaMes {
  mes: string; // "YYYY-MM"
  quantidade: number;
}

export async function lerVendasMensais(skuCanonico: string, desdeMes: string): Promise<VendaMes[]> {
  const sql = getPainelSql();
  if (!sql) return [];

  try {
    const rows = await sql<{ mes: string; qtd_total: number }[]>`
      SELECT mes, qtd_total
      FROM vendas_mensais
      WHERE sku_canonico = ${skuCanonico} AND mes >= ${desdeMes}
      ORDER BY mes
    `;
    return rows.map((row) => ({ mes: row.mes, quantidade: Number(row.qtd_total) }));
  } catch {
    return [];
  }
}
