import { useState } from "react";
import {
  useAtivarFornecedor,
  useCreateFornecedor,
  useDesativarFornecedor,
  useEditarFornecedor,
  useExcluirFornecedor,
  useFornecedores,
} from "../api/fornecedores";
import { useCreateTipoProduto, useEditarTipoProduto, useExcluirTipoProduto, useTiposProduto } from "../api/tiposProduto";
import { ApiError } from "../api/client";
import type { Fornecedor } from "../api/types";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

const FORM_VAZIO = {
  nome: "",
  pais: "",
  moeda_padrao: "USD",
  exige_pagamento_inicial: false,
  percentual_pagamento_inicial: "",
  tipos_produto: [] as string[],
};

function capitalizar(texto: string): string {
  return texto.length ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

export function FornecedoresPage() {
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const { data: fornecedores, isLoading } = useFornecedores(mostrarInativos ? undefined : true);
  const { data: tiposProduto } = useTiposProduto();
  const createFornecedor = useCreateFornecedor();
  const editarFornecedor = useEditarFornecedor();
  const desativar = useDesativarFornecedor();
  const ativar = useAtivarFornecedor();
  const excluir = useExcluirFornecedor();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLinha, setErroLinha] = useState<{ id: string; mensagem: string } | null>(null);

  function iniciarEdicao(fornecedor: Fornecedor) {
    setEditingId(fornecedor.id);
    setForm({
      nome: fornecedor.nome,
      pais: fornecedor.pais ?? "",
      moeda_padrao: fornecedor.moeda_padrao,
      exige_pagamento_inicial: fornecedor.exige_pagamento_inicial,
      percentual_pagamento_inicial: fornecedor.percentual_pagamento_inicial?.toString() ?? "",
      tipos_produto: fornecedor.tipos_produto,
    });
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm(FORM_VAZIO);
    setErro(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    const data = {
      nome: form.nome,
      pais: form.pais || undefined,
      moeda_padrao: form.moeda_padrao,
      exige_pagamento_inicial: form.exige_pagamento_inicial,
      percentual_pagamento_inicial:
        form.exige_pagamento_inicial && form.percentual_pagamento_inicial
          ? Number(form.percentual_pagamento_inicial)
          : null,
      tipos_produto: form.tipos_produto,
    };
    const onError = (error: unknown) =>
      setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao salvar fornecedor");

    if (editingId) {
      editarFornecedor.mutate(
        { id: editingId, data },
        { onSuccess: () => cancelarEdicao(), onError },
      );
    } else {
      createFornecedor.mutate(data, { onSuccess: () => setForm(FORM_VAZIO), onError });
    }
  }

  function handleExcluir(fornecedor: Fornecedor) {
    setErroLinha(null);
    if (!window.confirm(`Excluir "${fornecedor.nome}" permanentemente? Essa ação não pode ser desfeita.`)) {
      return;
    }
    excluir.mutate(fornecedor.id, {
      onError: (error) =>
        setErroLinha({
          id: fornecedor.id,
          mensagem:
            error instanceof ApiError && typeof error.body === "object" && error.body && "error" in error.body
              ? String((error.body as { error: unknown }).error)
              : "Erro ao excluir fornecedor",
        }),
    });
  }

  const salvando = createFornecedor.isPending || editarFornecedor.isPending;

  return (
    <div className="space-y-6">
      <TiposProdutoSection />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          {editingId ? "Editando fornecedor" : "Novo fornecedor"}
        </h2>
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
          <div className="sm:col-span-2">
            <label className={labelClass}>Tipos de produto que vende</label>
            <div className="flex flex-wrap items-center gap-3">
              {(tiposProduto ?? []).map((tipo) => (
                <label key={tipo.nome} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.tipos_produto.includes(tipo.nome)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipos_produto: e.target.checked
                          ? [...form.tipos_produto, tipo.nome]
                          : form.tipos_produto.filter((t) => t !== tipo.nome),
                      })
                    }
                  />
                  {capitalizar(tipo.nome)}
                </label>
              ))}
              {!tiposProduto?.length && <span className="text-xs text-slate-500">Nenhum tipo cadastrado ainda.</span>}
            </div>
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
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            )}
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
                <th className="py-2">Tipos de produto</th>
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
                    {fornecedor.tipos_produto.length
                      ? fornecedor.tipos_produto.map(capitalizar).join(", ")
                      : "—"}
                  </td>
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
                  <td className="py-2">
                    <div className="flex justify-end gap-3 text-xs">
                      <button onClick={() => iniciarEdicao(fornecedor)} className="text-blue-600 hover:underline">
                        Editar
                      </button>
                      {fornecedor.ativo ? (
                        <button
                          onClick={() => desativar.mutate(fornecedor.id)}
                          className="text-amber-600 hover:underline"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => ativar.mutate(fornecedor.id)}
                          className="text-green-700 hover:underline"
                        >
                          Ativar
                        </button>
                      )}
                      <button onClick={() => handleExcluir(fornecedor)} className="text-red-600 hover:underline">
                        Excluir
                      </button>
                    </div>
                    {erroLinha?.id === fornecedor.id && (
                      <p className="mt-1 text-right text-xs text-red-600">{erroLinha.mensagem}</p>
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

function TiposProdutoSection() {
  const { data: tiposProduto } = useTiposProduto();
  const createTipoProduto = useCreateTipoProduto();
  const editarTipoProduto = useEditarTipoProduto();
  const excluirTipoProduto = useExcluirTipoProduto();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ nome: string; valor: string } | null>(null);
  const [erroLinha, setErroLinha] = useState<{ nome: string; mensagem: string } | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createTipoProduto.mutate(nome.trim().toLowerCase(), {
      onSuccess: () => setNome(""),
      onError: (error) =>
        setErro(
          error instanceof ApiError && error.status === 409
            ? "Já existe um tipo com esse nome."
            : "Erro ao cadastrar tipo de produto.",
        ),
    });
  }

  function salvarEdicao(nomeAtual: string) {
    const novoNome = editando?.valor.trim().toLowerCase();
    if (!novoNome || novoNome === nomeAtual) {
      setEditando(null);
      return;
    }
    setErroLinha(null);
    editarTipoProduto.mutate(
      { nome: nomeAtual, novoNome },
      {
        onSuccess: () => setEditando(null),
        onError: (error) =>
          setErroLinha({
            nome: nomeAtual,
            mensagem:
              error instanceof ApiError && error.status === 409
                ? "Já existe um tipo com esse nome."
                : "Erro ao renomear.",
          }),
      },
    );
  }

  function handleExcluir(tipoNome: string) {
    setErroLinha(null);
    if (!window.confirm(`Excluir o tipo "${capitalizar(tipoNome)}"? Só funciona se nenhum produto/fornecedor usar esse tipo.`)) {
      return;
    }
    excluirTipoProduto.mutate(tipoNome, {
      onError: (error) =>
        setErroLinha({
          nome: tipoNome,
          mensagem:
            error instanceof ApiError && error.status === 409
              ? "Em uso por produto(s) ou fornecedor(es) — não é possível excluir."
              : "Erro ao excluir.",
        }),
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Tipos de produto</h2>
      <p className="mb-3 text-xs text-slate-500">Cadastro dos tipos que um fornecedor pode vender.</p>

      {!!tiposProduto?.length && (
        <ul className="mb-3 space-y-1.5">
          {tiposProduto.map((tipo) => (
            <li key={tipo.nome} className="flex items-center gap-2 text-sm">
              {editando?.nome === tipo.nome ? (
                <>
                  <input
                    autoFocus
                    className={inputClass + " max-w-xs"}
                    value={editando.valor}
                    onChange={(e) => setEditando({ nome: tipo.nome, valor: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") salvarEdicao(tipo.nome);
                      if (e.key === "Escape") setEditando(null);
                    }}
                  />
                  <button
                    onClick={() => salvarEdicao(tipo.nome)}
                    disabled={editarTipoProduto.isPending}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setEditando(null)} className="text-xs text-slate-500 hover:underline">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-slate-700">{capitalizar(tipo.nome)}</span>
                  <button
                    onClick={() => setEditando({ nome: tipo.nome, valor: tipo.nome })}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleExcluir(tipo.nome)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </>
              )}
              {erroLinha?.nome === tipo.nome && <p className="text-xs text-red-600">{erroLinha.mensagem}</p>}
            </li>
          ))}
        </ul>
      )}
      {!tiposProduto?.length && <p className="mb-3 text-xs text-slate-500">Nenhum tipo cadastrado ainda.</p>}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <label className={labelClass}>Novo tipo</label>
          <input
            required
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: adesivo"
          />
        </div>
        <button
          type="submit"
          disabled={createTipoProduto.isPending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createTipoProduto.isPending ? "Salvando..." : "Cadastrar tipo"}
        </button>
      </form>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
