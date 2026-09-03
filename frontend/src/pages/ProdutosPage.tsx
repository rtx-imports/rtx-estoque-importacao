import { useState } from "react";
import { useTodosProdutos } from "../api/compra";
import { useFornecedores } from "../api/fornecedores";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

const TIPO_BADGE: Record<string, string> = {
  rolinho: "bg-blue-100 text-blue-700",
  placa: "bg-purple-100 text-purple-700",
};
const TIPO_LABEL: Record<string, string> = { rolinho: "Rolinho", placa: "Placa" };

export function ProdutosPage() {
  const { data: produtos, isLoading } = useTodosProdutos();
  const { data: fornecedores } = useFornecedores();
  const [fornecedorId, setFornecedorId] = useState("");

  const nomeFornecedor = (id: string | null) => fornecedores?.find((f) => f.id === id)?.nome ?? "—";

  const produtosFiltrados = produtos?.filter((p) => !fornecedorId || p.fornecedor_id === fornecedorId);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Produtos</h2>
          <div className="w-56">
            <label className={labelClass}>Filtrar por fornecedor</label>
            <select className={inputClass} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Todos</option>
              {fornecedores?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {!isLoading && produtosFiltrados?.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhum produto cadastrado ainda — o cadastro fica na aba Decisão de Compra, dentro de cada fornecedor.
          </p>
        )}
        {!!produtosFiltrados?.length && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2">SKU</th>
                <th className="py-2">Descrição</th>
                <th className="py-2">Fornecedor</th>
                <th className="py-2">Tipo</th>
                <th className="py-2 text-right">Custo (USD)</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => (
                <tr key={produto.sku} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{produto.sku}</td>
                  <td className="py-2">{produto.descricao || "—"}</td>
                  <td className="py-2">{nomeFornecedor(produto.fornecedor_id)}</td>
                  <td className="py-2">
                    {produto.tipo ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${TIPO_BADGE[produto.tipo]}`}>
                        {TIPO_LABEL[produto.tipo]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-right">{produto.custo_unit_usd}</td>
                  <td className="py-2">
                    <span
                      className={
                        produto.ativo
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {produto.ativo ? "ativo" : "inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
