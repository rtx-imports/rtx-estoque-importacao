import type { PropostaKpis } from "../../api/types";
import { formatarBRL, formatarUSD } from "./format";

/**
 * Painel superior — leitura em poucos segundos do estado da decisão de
 * compra para o fornecedor/tipo selecionado. Calculado sobre os itens que
 * "precisam de atenção" (mesmo conjunto da grade principal), não o
 * catálogo inteiro — os cards resumem o que está na tela.
 */
export function KpiCards({ kpis }: { kpis: PropostaKpis }) {
  const cards = [
    {
      label: "Valor sugerido para compra",
      valor: formatarUSD(kpis.totalSugeridoUsd),
      sub: formatarBRL(kpis.totalSugeridoBrl),
      tom: "text-ink",
    },
    {
      label: "Produtos críticos",
      valor: String(kpis.produtosCriticos),
      sub: "ruptura em até 3 meses",
      tom: kpis.produtosCriticos > 0 ? "text-red-600" : "text-emerald-600",
    },
    {
      label: "Saúde do estoque",
      valor: `${kpis.saudeEstoquePct}%`,
      sub: "SKUs sem risco de ruptura",
      tom: kpis.saudeEstoquePct >= 80 ? "text-emerald-600" : kpis.saudeEstoquePct >= 50 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Rupturas previstas",
      valor: String(kpis.rupturasPrevistas),
      sub: "dentro da janela de análise",
      tom: kpis.rupturasPrevistas > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Cobertura média",
      valor: kpis.coberturaMediaDias != null ? `${Math.round(kpis.coberturaMediaDias)} dias` : "—",
      sub: "estoque físico atual",
      tom: "text-ink",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border-rtx bg-surface p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-rtx">{card.label}</p>
          <p className={`num-tabular mt-1.5 text-lg font-semibold ${card.tom}`}>{card.valor}</p>
          <p className="text-[11px] text-muted-rtx">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
