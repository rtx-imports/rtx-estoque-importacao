import { Fragment, useState } from "react";
import { useSetEstoque } from "../../api/compra";
import type { PropostaItem } from "../../api/types";
import { STATUS_BORDA, STATUS_LABEL, acabaLabel, formatarBRL, formatarNumero, formatarUSD, mesLabel, statusLinha } from "./format";

const th1 = "sticky top-0 z-20 whitespace-nowrap border-b border-r border-slate-200 bg-white px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400";
const th2 = "sticky top-[22px] z-20 whitespace-nowrap border-b border-r border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-semibold text-slate-500";
const th3 = "sticky top-[42px] z-20 whitespace-nowrap border-b border-r border-slate-200 bg-white px-2 py-0.5 text-right text-[9px] font-semibold uppercase text-slate-400";
const tdClass = "whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-right";
const tdValorClass = tdClass + " bg-teal-50/60 text-teal-700";

export function necessidadeEfetiva(item: PropostaItem, overrides: Record<string, string>): number {
  const override = overrides[item.sku];
  if (override !== undefined && override !== "") return Number(override);
  return item.necessidade;
}

function formatarNumeroOuTraco(valor: number | null): string {
  return valor == null ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

interface GradePrincipalProps {
  itens: PropostaItem[];
  overrides: Record<string, string>;
  setOverrides: (overrides: Record<string, string>) => void;
  selecionados: Set<string>;
  setSelecionados: (selecionados: Set<string>) => void;
  cambio: number;
}

/**
 * Grade principal — layout replicado da planilha de referência da RTX (Item /
 * Width / Length / SKU / Estoque atual / Em trânsito / Acaba em / Dias
 * restantes / Quantidade sugerida / Valor da compra em 5 métricas USD+BRL /
 * plano mensal), agrupada por NCM quando cadastrado. "Quantidade sugerida" é
 * a célula editável — o valor digitado ali é a Qtd Escolhida (o "sugerida" no
 * nome é o rótulo pedido; o placeholder mostra a sugestão automática).
 */
export function GradePrincipal({ itens, overrides, setOverrides, selecionados, setSelecionados, cambio }: GradePrincipalProps) {
  const setEstoque = useSetEstoque();
  const [busca, setBusca] = useState("");

  const buscaLower = busca.trim().toLowerCase();
  const itensFiltrados = buscaLower
    ? itens.filter(
        (item) =>
          item.sku.toLowerCase().includes(buscaLower) ||
          item.descricao.toLowerCase().includes(buscaLower) ||
          (item.itemCode ?? "").toLowerCase().includes(buscaLower),
      )
    : itens;

  // Agrupa por NCM (sem NCM cadastrado fica num bloco sem cabeçalho, no topo).
  const itensVisiveis = [...itensFiltrados].sort((a, b) => (a.ncm ?? "").localeCompare(b.ncm ?? ""));

  const meses = itens[0]?.plan.map((_, m) => m) ?? [0, 1, 2, 3, 4, 5, 6];
  const totalColunas = 12 + 4 + meses.length;
  const totalNecessidade = itensVisiveis.reduce((soma, item) => soma + necessidadeEfetiva(item, overrides), 0);

  function toggleSelecionado(sku: string) {
    const proximo = new Set(selecionados);
    if (proximo.has(sku)) proximo.delete(sku);
    else proximo.add(sku);
    setSelecionados(proximo);
  }

  function toggleTodos() {
    const proximo = new Set(selecionados);
    if (itensVisiveis.every((item) => selecionados.has(item.sku))) {
      itensVisiveis.forEach((item) => proximo.delete(item.sku));
    } else {
      itensVisiveis.forEach((item) => proximo.add(item.sku));
    }
    setSelecionados(proximo);
  }

  const todosMarcados = itensVisiveis.length > 0 && itensVisiveis.every((item) => selecionados.has(item.sku));

  let ncmCorrente: string | null | undefined = undefined;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Decisão de Compra</h2>
          <p className="text-xs text-slate-500">
            "Quantidade sugerida" é editável — ajuste livremente antes de exportar/gerar o pedido; os valores da
            compra recalculam sozinhos.
          </p>
        </div>
        <div className="w-64">
          <input
            className="font-planilha w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="⌕ Buscar Client Code, SKU ou descrição..."
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-md border border-slate-200">
        <table className="font-planilha w-max min-w-full border-collapse text-[12px] tabular-nums">
          <thead>
            <tr>
              <th rowSpan={3} className={th1 + " text-center"}>
                <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} title="Selecionar todos" />
              </th>
              <th rowSpan={3} className={th1 + " text-left"}>
                Item
              </th>
              <th rowSpan={3} className={th1}>
                Width
              </th>
              <th rowSpan={3} className={th1}>
                Length
              </th>
              <th rowSpan={3} className={th1}>
                SKU
              </th>
              <th colSpan={3} className={th1 + " text-center"} title="Estoque atual = Full + Cross">
                Estoque atual
              </th>
              <th rowSpan={3} className={th1}>
                Em trânsito
              </th>
              <th rowSpan={3} className={th1}>
                Acaba em
              </th>
              <th rowSpan={3} className={th1}>
                Dias restantes
              </th>
              <th rowSpan={3} className={th1 + " bg-teal-50"}>
                Quantidade sugerida
              </th>
              <th colSpan={4} className={th1 + " text-center bg-teal-50/60"}>
                Valor da compra
              </th>
              {meses.map((m) => (
                <th key={m} rowSpan={3} className={th1 + (m === 0 ? " bg-teal-50" : "")}>
                  {mesLabel(m)}
                </th>
              ))}
            </tr>
            <tr>
              <th rowSpan={2} className={th2} title="Unidades em centros de fulfillment (ML Full/Shopee FBS/Amazon FBA) — lido do painel, não editável">
                Full
              </th>
              <th rowSpan={2} className={th2} title="Estoque atual − Full — estoque fora do Full (galpão RTX)">
                Cross
              </th>
              <th rowSpan={2} className={th2 + " bg-teal-50"} title="Editável — Full + Cross">
                Total
              </th>
              <th colSpan={2} className={th2} title="Custo FOB (sem imposto de importação — esse cálculo fica pro financeiro-gbw)">
                Custo unitário
              </th>
              <th colSpan={2} className={th2} title="Custo unitário × quantidade sugerida">
                Custo total
              </th>
            </tr>
            <tr>
              {Array.from({ length: 2 }).map((_, i) => (
                <Fragment key={i}>
                  <th className={th3}>US$</th>
                  <th className={th3}>R$</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {itensVisiveis.map((item) => {
              const qtd = necessidadeEfetiva(item, overrides);
              const custoUnitUsd = item.custoUnitUsd;
              const custoTotalUsd = custoUnitUsd * qtd;

              const linhas: React.ReactNode[] = [];
              if (item.ncm !== ncmCorrente) {
                ncmCorrente = item.ncm;
                linhas.push(
                  <tr key={`ncm-${item.ncm ?? "sem-ncm"}-${item.sku}`}>
                    <td colSpan={totalColunas} className="border-b border-slate-200 bg-slate-100 px-2 py-1 text-left text-xs font-semibold text-slate-600">
                      {item.ncm ? `NCM ${item.ncm}` : "Sem NCM cadastrado"}
                    </td>
                  </tr>,
                );
              }

              linhas.push(
                <tr key={item.sku} className="hover:bg-slate-50">
                  <td className={tdClass + " text-center"}>
                    <input type="checkbox" checked={selecionados.has(item.sku)} onChange={() => toggleSelecionado(item.sku)} />
                  </td>
                  <td
                    className={`whitespace-normal border-b border-r border-slate-100 border-l-[3px] bg-white px-2.5 py-1 text-left align-middle ${STATUS_BORDA[statusLinha(item)]}`}
                    title={`Status: ${STATUS_LABEL[statusLinha(item)]}`}
                  >
                    <div className="font-medium text-slate-800">{item.itemCode ?? item.sku}</div>
                    <div className="text-[11px] text-slate-500">{item.descricao}</div>
                  </td>
                  <td className={tdClass}>{formatarNumeroOuTraco(item.widthM)}</td>
                  <td className={tdClass}>{formatarNumeroOuTraco(item.lengthM)}</td>
                  <td className={tdClass + " text-slate-500"}>{item.sku}</td>
                  <td className={tdClass + " text-slate-500"} title="Lido do painel-gbw (ML Full/Shopee FBS/Amazon FBA) — não editável">
                    {item.estoqueFull != null ? formatarNumero(item.estoqueFull) : "—"}
                  </td>
                  <td className={tdClass + " text-slate-500"} title="Estoque atual − Full">
                    {item.estoqueCross != null ? formatarNumero(item.estoqueCross) : "—"}
                  </td>
                  <td className={tdClass + " bg-teal-50"}>
                    <input
                      type="number"
                      min={0}
                      className="font-planilha w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right tabular-nums outline-none hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                      defaultValue={item.estoque}
                      onBlur={(e) => {
                        const valor = Number(e.target.value);
                        if (Number.isFinite(valor) && valor !== item.estoque) {
                          setEstoque.mutate({ sku: item.sku, quantidade: valor });
                        }
                      }}
                    />
                  </td>
                  <td className={tdClass} title="Calculado a partir dos pedidos embarcados/aguardando desembaraço/em desova/conferência — não editável">
                    {item.transito}
                  </td>
                  <td className={tdClass}>{acabaLabel(item)}</td>
                  <td className={tdClass}>{item.diasRestantes != null ? Math.round(item.diasRestantes) : "—"}</td>
                  <td className={tdClass + " bg-teal-50"}>
                    <input
                      type="number"
                      min={0}
                      title={`Sugestão automática: ${item.necessidade}`}
                      className="font-planilha w-16 rounded border border-slate-300 px-1 py-0.5 text-right font-semibold tabular-nums outline-none focus:border-blue-500"
                      placeholder={String(item.necessidade)}
                      value={overrides[item.sku] ?? ""}
                      onChange={(e) => setOverrides({ ...overrides, [item.sku]: e.target.value })}
                    />
                  </td>
                  <td className={tdValorClass}>{formatarUSD(custoUnitUsd)}</td>
                  <td className={tdValorClass}>{formatarBRL(custoUnitUsd * cambio)}</td>
                  <td className={tdValorClass}>{formatarUSD(custoTotalUsd)}</td>
                  <td className={tdValorClass}>{formatarBRL(custoTotalUsd * cambio)}</td>
                  {item.plan.map((qtdMes, m) => (
                    <td key={m} className={tdClass + " text-slate-500" + (m === 0 ? " bg-teal-50" : "")} title={`plano do motor pra ${mesLabel(m)}`}>
                      {qtdMes > 0 ? formatarNumero(qtdMes) : "·"}
                    </td>
                  ))}
                </tr>,
              );
              return linhas;
            })}
            {!itensVisiveis.length && (
              <tr>
                <td colSpan={totalColunas} className="px-3 py-4 text-center text-sm text-slate-400">
                  Nenhum produto encontrado para "{busca}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="font-planilha text-xs text-slate-500">
          Selecionados: <span className="font-semibold text-slate-800">{selecionados.size}</span> · Total a pedir
          agora: <span className="font-semibold text-slate-800">{formatarNumero(totalNecessidade)}</span>
        </p>
      </div>
    </section>
  );
}
