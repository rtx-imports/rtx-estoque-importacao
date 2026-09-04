import { useState } from "react";
import type { PropostaItem, XyzClass } from "../../api/types";
import { XYZ_COR } from "./format";

const FILTROS: (XyzClass | "TODOS")[] = ["TODOS", "X", "Y", "Z"];
const XYZ_DESC: Record<XyzClass, string> = {
  X: "Demanda estável — fácil de prever",
  Y: "Variação moderada",
  Z: "Demanda irregular — difícil de prever",
};

/** Curva XYZ — previsibilidade da demanda (coeficiente de variação da série mensal
 * de vendas). Mesmo universo da Curva ABC: catálogo inteiro do fornecedor/tipo. */
export function CurvaXyzTab({ itens }: { itens: PropostaItem[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("TODOS");

  const ordenados = [...itens].sort((a, b) => (a.coefVariacao ?? Infinity) - (b.coefVariacao ?? Infinity));
  const visiveis = filtro === "TODOS" ? ordenados : ordenados.filter((i) => i.classeXyz === filtro);
  const contagem = { X: 0, Y: 0, Z: 0 };
  for (const item of itens) contagem[item.classeXyz]++;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Curva XYZ — previsibilidade da demanda</h2>
          <p className="text-xs text-slate-500">
            X = demanda estável (CV ≤ 0,5), Y = variação moderada (CV ≤ 1,0), Z = irregular ou sem histórico
            suficiente.
          </p>
        </div>
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium " +
                (filtro === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {f === "TODOS" ? "Todos" : `${f} (${contagem[f]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2 text-center">Classe</th>
              <th className="px-2 py-2 text-right">Coef. variação</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((item) => (
              <tr key={item.sku} className="border-b border-slate-100">
                <td className="px-2 py-1.5 font-medium">{item.sku}</td>
                <td className="px-2 py-1.5 text-slate-600">{item.descricao}</td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${XYZ_COR[item.classeXyz]}`}
                    title={XYZ_DESC[item.classeXyz]}
                  >
                    {item.classeXyz}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {item.coefVariacao != null ? item.coefVariacao.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
            {!visiveis.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-slate-400">
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
