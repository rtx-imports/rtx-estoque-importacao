import { useState } from "react";
import { useCreateFornecedor, useDesativarFornecedor, useFornecedores } from "../api/fornecedores";
import { ApiError } from "../api/client";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

export function FornecedoresPage() {
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const { data: fornecedores, isLoading } = useFornecedores(mostrarInativos ? undefined : true);
  const createFornecedor = useCreateFornecedor();
  const desativar = useDesativarFornecedor();

  const [form, setForm] = useState({
    nome: "",
    pais: "",
    moeda_padrao: "USD",
    exige_pagamento_inicial: false,
    percentual_pagamento_inicial: "",
  });
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createFornecedor.mutate(
      {
        nome: form.nome,
        pais: form.pais || undefined,
        moeda_padrao: form.moeda_padrao,
        exige_pagamento_inicial: form.exige_pagamento_inicial,
        percentual_pagamento_inicial:
          form.exige_pagamento_inicial && form.percentual_pagamento_inicial
            ? Number(form.percentual_pagamento_inicial)
            : null,
      },
      {
        onSuccess: () =>
          setForm({ nome: "", pais: "", moeda_padrao: "USD", exige_pagamento_inicial: false, percentual_pagamento_inicial: "" }),
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao criar fornecedor"),
      },
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Novo fornecedor</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              required
              className={inputClass}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>País</label>
            <input
              className={inputClass}
              value={form.pais}
              onChange={(e) => setForm({ ...form, pais: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Moeda padrão</label>
            <input
              className={inputClass}
              value={form.moeda_padrao}
              onChange={(e) => setForm({ ...form, moeda_padrao: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="exige_pagamento_inicial"
              type="checkbox"
              checked={form.exige_pagamento_inicial}
              onChange={(e) => setForm({ ...form, exige_pagamento_inicial: e.target.checked })}
            />
            <label htmlFor="exige_pagamento_inicial" className="text-sm text-slate-700">
              Exige pagamento inicial
            </label>
          </div>
          {form.exige_pagamento_inicial && (
            <div>
              <label className={labelClass}>% pagamento inicial</label>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form.percentual_pagamento_inicial}
                onChange={(e) => setForm({ ...form, percentual_pagamento_inicial: e.target.value })}
              />
            </div>
          )}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createFornecedor.isPending}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createFornecedor.isPending ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </form>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Fornecedores</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {!isLoading && fornecedores?.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum fornecedor cadastrado ainda.</p>
        )}
        {!!fornecedores?.length && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2">Nome</th>
                <th className="py-2">País</th>
                <th className="py-2">Moeda</th>
                <th className="py-2">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((fornecedor) => (
                <tr key={fornecedor.id} className="border-b border-slate-100">
                  <td className="py-2">{fornecedor.nome}</td>
                  <td className="py-2">{fornecedor.pais ?? "—"}</td>
                  <td className="py-2">{fornecedor.moeda_padrao}</td>
                  <td className="py-2">
                    <span
                      className={
                        fornecedor.ativo
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {fornecedor.ativo ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {fornecedor.ativo && (
                      <button
                        onClick={() => desativar.mutate(fornecedor.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Desativar
                      </button>
                    )}
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
