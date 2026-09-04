import { useState } from "react";
import type { AbcClass, PropostaItem } from "../../api/types";
import { ABC_COR, formatarUSD } from "./format";

const FILTROS: (AbcClass | "TODOS")[] = ["TODOS", "A", "B", "C"];

/** Curva ABC — relevância financeira (Pareto sobre demanda × custo). Calculada
 * sobre o catálogo inteiro do fornecedor/tipo, não só quem precisa comprar agora. */
export function CurvaAbcTab({ itens }: { itens: PropostaItem[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("TODOS");

  const ordenados = [...itens].sort((a, b) => b.valorFinanceiroUsd - a.valorFinanceiroUsd);
  const visiveis = filtro === "TODOS" ? ordenados : ordenados.filter((i) => i.classeAbc === filtro);
  const contagem = { A: 0, B: 0, C: 0 };
  for (const item of itens) contagem[item.classeAbc]++;

  return (
    <section className="rounded-lg border border-border-rtx bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Curva ABC — relevância financeira</h2>
          <p className="text-xs text-muted-rtx">
            Classe A concentra até 70% do valor (demanda × custo), B até 90%, C o restante — clássico Pareto.
          </p>
        </div>
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium " +
                (filtro === f ? "bg-navy text-white" : "bg-paper text-muted-rtx hover:bg-border-rtx")
              }
            >
              {f === "TODOS" ? "Todos" : `${f} (${contagem[f]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto rounded-md border border-border-rtx">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2 text-center">Classe</th>
              <th className="px-2 py-2 text-right">Valor financeiro (USD/mês)</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((item) => (
              <tr key={item.sku} className="border-b border-border-rtx">
                <td className="px-2 py-1.5 font-medium">{item.sku}</td>
                <td className="px-2 py-1.5 text-muted-rtx">{item.descricao}</td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ABC_COR[item.classeAbc]}`}>
                    {item.classeAbc}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatarUSD(item.valorFinanceiroUsd)}</td>
              </tr>
            ))}
            {!visiveis.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-rtx">
                  Nenhum produto nessa classe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
