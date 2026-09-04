/**
 * Classificação XYZ por previsibilidade da demanda — coeficiente de
 * variação (CV = desvio padrão / média) da série mensal de vendas.
 * Não existe no `rtx-pedidos`; critério novo, seguindo o padrão de mercado
 * mais comum para essa curva:
 *   CV ≤ 0.5 => X (demanda estável, fácil de prever)
 *   CV ≤ 1.0 => Y (demanda com variação moderada)
 *   CV > 1.0 => Z (demanda irregular, difícil de prever)
 * Sem histórico de venda (< 2 meses com venda) não dá pra medir variação —
 * cai em Z (mais conservador: trata como imprevisível, não inventa "X").
 */

export type XyzClass = "X" | "Y" | "Z";

export function coeficienteVariacao(quantidadesMensais: number[]): number | null {
  const valores = quantidadesMensais.filter((v) => Number.isFinite(v));
  if (valores.length < 2) return null;
  const media = valores.reduce((a, v) => a + v, 0) / valores.length;
  if (media <= 0) return null;
  const variancia = valores.reduce((a, v) => a + (v - media) ** 2, 0) / valores.length;
  const desvioPadrao = Math.sqrt(variancia);
  return desvioPadrao / media;
}

export function classificarXyz(cv: number | null): XyzClass {
  if (cv === null) return "Z";
  if (cv <= 0.5) return "X";
  if (cv <= 1.0) return "Y";
  return "Z";
}
