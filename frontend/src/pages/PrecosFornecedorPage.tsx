import { ConceitoBanner } from "./ConceitoBanner";

/**
 * Preços por fornecedor — rascunho de direção visual do "custo de FO"
 * (pedido de Beatriz: tabela de preço unitário por produto, editável,
 * separada do fluxo de pedido — o pedido consulta esse preço em vez de
 * duplicar). Ainda não implementado: aguarda as planilhas de preço
 * unitário/padrão do setor de importação (ver TODO.md).
 */
export function PrecosFornecedorPage() {
  const itens = [
    { codigo: "DG3111G", descricao: "Self Adhesive Vinyl Glossy — 80/80GSM", unidade: "m²", preco: "0,3261", moeda: "USD", atualizado: "02/09/2026" },
    { codigo: "DC3000", descricao: "Colorful Vinyl, Black Matte — 80/60GSM", unidade: "m²", preco: "0,4337", moeda: "USD", atualizado: "02/09/2026" },
    { codigo: "DG3201G", descricao: "Blockout Vinyl, Glossy — 80/60GSM", unidade: "m²", preco: "0,4316", moeda: "USD", atualizado: "28/08/2026" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Preços por fornecedor</h1>
          <p className="text-sm text-muted-rtx">
            Preço unitário por produto, editável — separado do pedido (o pedido consulta esse preço, não duplica).
          </p>
        </div>
        <button disabled className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy opacity-50">
          + Novo item de preço
        </button>
      </div>

      <ConceitoBanner>
        Aguardando as planilhas de preço unitário/padrão do setor de importação (ver TODO.md) — layout já definido,
        edição inline ainda não ligada ao backend.
      </ConceitoBanner>

      <section className="rounded-lg border border-border-rtx bg-white">
        <div className="border-b border-border-rtx px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Digiflex — Rolinhos</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
              <th className="px-4 py-2">Item code</th>
              <th className="px-4 py-2">Descrição</th>
              <th className="px-4 py-2">Unidade</th>
              <th className="px-4 py-2">Preço unitário</th>
              <th className="px-4 py-2">Moeda</th>
              <th className="px-4 py-2">Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.codigo} className="border-b border-border-rtx last:border-0">
                <td className="px-4 py-2 font-medium text-ink">{item.codigo}</td>
                <td className="px-4 py-2 text-muted-rtx">{item.descricao}</td>
                <td className="px-4 py-2 text-muted-rtx">{item.unidade}</td>
                <td className="px-4 py-2">
                  <input
                    disabled
                    defaultValue={item.preco}
                    className="num-tabular w-24 rounded border border-border-rtx-strong bg-gold/10 px-2 py-1 text-right text-sm text-gold-dark"
                  />
                </td>
                <td className="px-4 py-2 text-muted-rtx">{item.moeda}</td>
                <td className="num-tabular px-4 py-2 text-muted-rtx">{item.atualizado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
