import { useEffect, useState } from "react";
import { useSimulacao } from "../../api/compra";
import type { Parametros } from "../../api/types";
import { KpiCards } from "./KpiCards";
import { formatarBRL, formatarUSD } from "./format";

const inputClass = "w-full rounded-md border border-border-rtx-strong px-3 py-1.5 text-sm focus:border-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-muted-rtx mb-1";

function useDebounced<T>(valor: T, atrasoMs = 400): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return debounced;
}

interface SimulacoesTabProps {
  fornecedorId: string;
  paramsAtual: Parametros;
}

/** Aba Simulações: testa câmbio/lead time/crescimento/janela sem alterar dado real —
 * cada mudança recalcula a proposta inteira no backend (POST /proposta/simular) e
 * atualiza os cards + tabela instantaneamente (debounce de 400ms pra não martelar a API). */
export function SimulacoesTab({ fornecedorId, paramsAtual }: SimulacoesTabProps) {
  const [form, setForm] = useState({
    cambio: String(paramsAtual.cambio),
    leadTimeDias: String(paramsAtual.leadTimeDias),
    crescimentoMensal: String(paramsAtual.crescimentoMensal),
    janelaMeses: String(paramsAtual.janelaMeses),
  });
  const formDebounced = useDebounced(form);
  const simular = useSimulacao();

  useEffect(() => {
    simular.mutate({
      fornecedorId,
      overrides: {},
      parametros: {
        cambio: Number(formDebounced.cambio) || undefined,
        leadTimeDias: Number(formDebounced.leadTimeDias) || undefined,
        crescimentoMensal: Number(formDebounced.crescimentoMensal) || undefined,
        janelaMeses: Number(formDebounced.janelaMeses) || undefined,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDebounced, fornecedorId]);

  function resetar() {
    setForm({
      cambio: String(paramsAtual.cambio),
      leadTimeDias: String(paramsAtual.leadTimeDias),
      crescimentoMensal: String(paramsAtual.crescimentoMensal),
      janelaMeses: String(paramsAtual.janelaMeses),
    });
  }

  const resultado = simular.data;
  const alterado =
    form.cambio !== String(paramsAtual.cambio) ||
    form.leadTimeDias !== String(paramsAtual.leadTimeDias) ||
    form.crescimentoMensal !== String(paramsAtual.crescimentoMensal) ||
    form.janelaMeses !== String(paramsAtual.janelaMeses);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border-rtx bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Cenário</h2>
          {alterado && (
            <button onClick={resetar} className="text-xs font-medium text-gold-dark hover:underline">
              Voltar ao cenário atual
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelClass}>Câmbio</label>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={form.cambio}
              onChange={(e) => setForm({ ...form, cambio: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Lead time (dias)</label>
            <input
              type="number"
              className={inputClass}
              value={form.leadTimeDias}
              onChange={(e) => setForm({ ...form, leadTimeDias: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Crescimento mensal (fator)</label>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={form.crescimentoMensal}
              onChange={(e) => setForm({ ...form, crescimentoMensal: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Janela de projeção (meses)</label>
            <input
              type="number"
              className={inputClass}
              value={form.janelaMeses}
              onChange={(e) => setForm({ ...form, janelaMeses: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-rtx">
          Nada aqui é salvo — é só um teste de cenário. Pra valer pra sério, ajuste em "Parâmetros do cálculo" na
          aba Decisão de Compra.
        </p>
      </div>

      {simular.isPending && !resultado && <p className="text-sm text-muted-rtx">Simulando...</p>}

      {resultado && (
        <>
          <KpiCards kpis={resultado.kpis} />
          <div className="rounded-lg border border-border-rtx bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Necessidade por produto neste cenário</h3>
            <div className="max-h-[50vh] overflow-auto rounded-md border border-border-rtx">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Descrição</th>
                    <th className="px-2 py-2 text-right">Qtd sugerida</th>
                    <th className="px-2 py-2 text-right">Valor (USD)</th>
                    <th className="px-2 py-2 text-right">Valor (BRL)</th>
                    <th className="px-2 py-2">Acaba em</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item) => (
                    <tr key={item.sku} className="border-b border-border-rtx">
                      <td className="px-2 py-1.5 font-medium">{item.sku}</td>
                      <td className="px-2 py-1.5 text-muted-rtx">{item.descricao}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{item.necessidade}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatarUSD(item.custoUsd)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatarBRL(item.custoBrl)}</td>
                      <td className="px-2 py-1.5">
                        {item.acabaTipo === "mes" ? `mês ${item.acabaMeses}` : item.acabaTipo === "acima12" ? ">12m" : "sem giro"}
                      </td>
                    </tr>
                  ))}
                  {!resultado.itens.length && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-rtx">
                        Nenhum produto precisaria de atenção neste cenário.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
