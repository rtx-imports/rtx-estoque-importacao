/**
 * Classifica um SKU do Tiny em "rolinho" ou "placa" pelo próprio código,
 * evitando digitação manual da categoria (decisão 17). Regra herdada do
 * `rtx-pedidos` (src/routing/fornecedor.ts): o SKU canônico tem 14
 * caracteres — MM(2) LLL(3) CCCCCC(6) TTT(3) — e a "linha" (posições 3-5,
 * `LLL`) define o tipo: "605" é placa, qualquer outra linha numérica é
 * rolinho. SKUs fora desse padrão (outras linhas do catálogo Tiny que não
 * são de importação) não são classificáveis — devolve null, e o cadastro
 * continua manual pra esses casos.
 */

export type TipoProduto = "rolinho" | "placa";

const TAMANHO_SKU_CANONICO = 14;
const LINHA_PLACAS = "605";

export function classificarTipoPorSku(sku: string): TipoProduto | null {
  if (sku.length !== TAMANHO_SKU_CANONICO) return null;
  const linha = sku.slice(2, 5);
  if (!/^\d{3}$/.test(linha)) return null;
  return linha === LINHA_PLACAS ? "placa" : "rolinho";
}
