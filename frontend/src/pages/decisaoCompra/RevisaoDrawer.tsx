import { useState } from "react";
import { ApiError } from "../../api/client";
import { useExportarPedido, useGerarPedido } from "../../api/compra";
import type { PropostaItem } from "../../api/types";
import { necessidadeEfetiva } from "./GradePrincipal";
import { formatarBRL, formatarUSD } from "./format";

interface RevisaoDrawerProps {
  aberto: boolean;
  onClose: () => void;
  fornecedorId: string;
  fornecedorNome: string;
  itensGrade: PropostaItem[];
  selecionados: Set<string>;
  overrides: Record<string, string>;
  cambio: number;
  onPedidoGerado: (id: string) => void;
}

/**
 * Tela de revisão — último passo antes de sair do sistema. O botão principal
 * é EXPORTAR (planilha pro fornecedor); "Gerar Pedido" é a ação secundária,
 * que cria o registro de acompanhamento na página Pedidos (opcional aqui,
 * decisão do usuário — ver instrução da página: "o botão mais importante não
 * é Salvar, é Exportar Pedido para Fornecedor").
 */
export function RevisaoDrawer({
  aberto,
  onClose,
  fornecedorId,
  fornecedorNome,
  itensGrade,
  selecionados,
  overrides,
  cambio,
  onPedidoGerado,
}: RevisaoDrawerProps) {
  const exportar = useExportarPedido();
  const gerarPedido = useGerarPedido();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const linhas = itensGrade
    .filter((item) => selecionados.has(item.sku))
    .map((item) => {
      const qtdEscolhida = necessidadeEfetiva(item, overrides);
      return {
        item,
        qtdEscolhida,
        valorUsd: qtdEscolhida * item.custoUnitUsd,
        valorBrl: qtdEscolhida * item.custoUnitUsd * cambio,
      };
    });
  const totalUsd = linhas.reduce((acc, l) => acc + l.valorUsd, 0);
  const totalBrl = linhas.reduce((acc, l) => acc + l.valorBrl, 0);

  function handleExportar() {
    setErro(null);
    exportar.mutate(
      { fornecedorId, itens: linhas.map((l) => ({ sku: l.item.sku, quantidade: l.qtdEscolhida })) },
      { onError: () => setErro("Falha ao gerar a planilha de exportação.") },
    );
  }

  function handleGerarPedido() {
    setErro(null);
    // zera quem não foi selecionado (gerar-pedido do backend olha o fornecedor
    // inteiro, não só a seleção da tela) e aplica a Qtd Escolhida de quem foi.
    const overridesParaPedido: Record<string, number> = {};
    for (const item of itensGrade) {
      overridesParaPedido[item.sku] = selecionados.has(item.sku) ? necessidadeEfetiva(item, overrides) : 0;
    }
    gerarPedido.mutate(
      { fornecedorId, overrides: overridesParaPedido },
      {
        onSuccess: (pedido) => onPedidoGerado(pedido.id),
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao gerar pedido"),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Revisar pedido — {fornecedorNome}</h2>
            <p className="text-xs text-muted-rtx">{linhas.length} produto(s) selecionado(s)</p>
          </div>
          <button onClick={onClose} className="text-muted-rtx hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mb-4 overflow-auto rounded-md border border-border-rtx">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper">
              <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
                <th className="px-2 py-2">Produto</th>
                <th className="px-2 py-2 text-right">Qtd Sugerida</th>
                <th className="px-2 py-2 text-right">Qtd Escolhida</th>
                <th className="px-2 py-2 text-right">Valor USD</th>
                <th className="px-2 py-2 text-right">Valor BRL</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ item, qtdEscolhida, valorUsd, valorBrl }) => (
                <tr key={item.sku} className="border-b border-border-rtx">
                  <td className="px-2 py-1.5">
                    <div className="font-medium text-ink">{item.sku}</div>
                    <div className="text-[11px] text-muted-rtx">{item.descricao}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-rtx">{item.necessidade}</td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{qtdEscolhida}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatarUSD(valorUsd)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatarBRL(valorBrl)}</td>
                </tr>
              ))}
              {!linhas.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-rtx">
                    Nenhum produto selecionado — marque produtos na grade antes de revisar.
                  </td>
                </tr>
              )}
            </tbody>
            {!!linhas.length && (
              <tfoot>
                <tr className="border-t border-border-rtx font-semibold">
                  <td className="px-2 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatarUSD(totalUsd)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatarBRL(totalBrl)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        {exportar.isSuccess && <p className="mb-3 text-sm text-green-700">Planilha exportada com sucesso.</p>}
        {gerarPedido.isSuccess && <p className="mb-3 text-sm text-green-700">Pedido gerado — abrindo...</p>}

        <div className="mt-auto space-y-2 border-t border-border-rtx pt-4">
          <button
            onClick={handleExportar}
            disabled={exportar.isPending || !linhas.length}
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {exportar.isPending ? "Gerando planilha..." : "⬇ Exportar Pedido para Fornecedor"}
          </button>
          <button
            onClick={handleGerarPedido}
            disabled={gerarPedido.isPending || !linhas.length}
            className="w-full rounded-md border border-border-rtx-strong px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
          >
            {gerarPedido.isPending ? "Gerando..." : "Gerar Pedido (acompanhamento na página Pedidos)"}
          </button>
          <p className="text-center text-[11px] text-muted-rtx">
            Exportar não cria pedido; Gerar Pedido não envia planilha — os dois são independentes, use um, outro ou
            os dois.
          </p>
        </div>
      </div>
    </div>
  );
}
