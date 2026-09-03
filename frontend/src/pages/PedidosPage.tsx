import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFornecedores } from "../api/fornecedores";
import { ApiError } from "../api/client";
import { useCreatePedido, usePedidos } from "../api/pedidos";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

export function PedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos, isLoading } = usePedidos();
  const { data: fornecedores } = useFornecedores(true);
  const createPedido = useCreatePedido();

  const [fornecedorId, setFornecedorId] = useState("");
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const fornecedorPorId = new Map((fornecedores ?? []).map((f) => [f.id, f.nome]));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createPedido.mutate(
      { fornecedor_id: fornecedorId, numero_referencia: numeroReferencia || undefined },
      {
        onSuccess: (pedido) => navigate(`/pedidos/${pedido.id}`),
        onError: (error) => setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao criar pedido"),
      },
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Novo pedido</h2>
        {!fornecedores?.length ? (
          <p className="text-sm text-slate-500">
            Cadastre um fornecedor primeiro na aba{" "}
            <a href="/fornecedores" className="text-blue-600 underline">
              Fornecedores
            </a>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Fornecedor *</label>
              <select
                required
                className={inputClass}
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Número de referência</label>
              <input
                className={inputClass}
                placeholder="ex.: DO260623318"
                value={numeroReferencia}
                onChange={(e) => setNumeroReferencia(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={createPedido.isPending}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createPedido.isPending ? "Criando..." : "Criar pedido"}
              </button>
            </div>
          </form>
        )}
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Pedidos</h2>
        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {!isLoading && pedidos?.length === 0 && <p className="text-sm text-slate-500">Nenhum pedido criado ainda.</p>}
        {!!pedidos?.length && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2">Referência</th>
                <th className="py-2">Fornecedor</th>
                <th className="py-2">Status</th>
                <th className="py-2">Moeda</th>
                <th className="py-2">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => navigate(`/pedidos/${pedido.id}`)}
                >
                  <td className="py-2">{pedido.numero_referencia ?? "—"}</td>
                  <td className="py-2">{fornecedorPorId.get(pedido.fornecedor_id) ?? pedido.fornecedor_id}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {pedido.status}
                    </span>
                  </td>
                  <td className="py-2">{pedido.moeda}</td>
                  <td className="py-2">{new Date(pedido.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
