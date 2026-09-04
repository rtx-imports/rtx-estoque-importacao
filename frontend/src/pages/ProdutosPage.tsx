import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { useCreateProduto, useEditarProduto, useSetEstoque, useTodosProdutos } from "../api/compra";
import { useImportarCatalogoTiny, useSincronizarEstoqueLote, useTinyProdutos } from "../api/tiny";
import { useTiposProduto } from "../api/tiposProduto";
import type { TinyProduto } from "../api/types";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const smallInputClass = "w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

function capitalizar(texto: string): string {
  return texto.length ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

function useDebounced<T>(valor: T, atrasoMs = 350): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return debounced;
}

export function ProdutosPage() {
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");
  const { data: produtos, isLoading } = useTodosProdutos(filtroTipo || undefined);
  const { data: tiposProduto } = useTiposProduto();
  const editarProduto = useEditarProduto();
  const setEstoque = useSetEstoque();

  const buscaLower = busca.trim().toLowerCase();
  const produtosFiltrados = buscaLower
    ? produtos?.filter(
        (p) => p.sku.toLowerCase().includes(buscaLower) || p.descricao.toLowerCase().includes(buscaLower),
      )
    : produtos;

  return (
    <div className="space-y-6">
      <SincronizarTinySection />
      <NovoProdutoSection />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Produtos</h2>
          <div className="flex gap-3">
            <div className="w-64">
              <label className={labelClass}>Buscar</label>
              <input
                className={inputClass}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="⌕ Buscar SKU ou descrição..."
              />
            </div>
            <div className="w-40">
              <label className={labelClass}>Filtrar por tipo</label>
              <select className={inputClass} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                {(tiposProduto ?? []).map((tipo) => (
                  <option key={tipo.nome} value={tipo.nome}>
                    {capitalizar(tipo.nome)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {!isLoading && produtos?.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum produto cadastrado ainda.</p>
        )}
        {!isLoading && !!produtos?.length && produtosFiltrados?.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum produto encontrado para "{busca}".</p>
        )}
        {!!produtosFiltrados?.length && (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2">SKU</th>
                <th className="py-2">Descrição</th>
                <th className="py-2" title="Código do cliente (ex. DG3111G) — usado na coluna Item da Decisão de Compra">
                  Client Code
                </th>
                <th className="py-2" title="Agrupa linhas na grade da Decisão de Compra">
                  NCM
                </th>
                <th className="py-2">Tipo</th>
                <th className="py-2 text-right" title="Nunca sincronizado com o Tiny ainda (—) é diferente de confirmado zero (0)">
                  Estoque
                </th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => (
                <tr key={produto.sku} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{produto.sku}</td>
                  <td className="py-2">{produto.descricao || "—"}</td>
                  <td className="py-2">
                    <input
                      className={smallInputClass + " w-28 text-left"}
                      defaultValue={produto.item_code ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const valor = e.target.value.trim();
                        if (valor !== (produto.item_code ?? "")) {
                          editarProduto.mutate({ sku: produto.sku, data: { item_code: valor || null } });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      className={smallInputClass + " w-24 text-left"}
                      defaultValue={produto.ncm ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const valor = e.target.value.trim();
                        if (valor !== (produto.ncm ?? "")) {
                          editarProduto.mutate({ sku: produto.sku, data: { ncm: valor || null } });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <select
                      className={`rounded-full border-none px-2 py-0.5 text-xs ${
                        produto.tipo ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                      }`}
                      value={produto.tipo ?? ""}
                      onChange={(e) => {
                        const valor = e.target.value;
                        editarProduto.mutate({ sku: produto.sku, data: { tipo: valor === "" ? null : valor } });
                      }}
                    >
                      <option value="">Sem tipo</option>
                      {(tiposProduto ?? []).map((tipo) => (
                        <option key={tipo.nome} value={tipo.nome}>
                          {capitalizar(tipo.nome)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      className={smallInputClass}
                      defaultValue={produto.estoque ?? ""}
                      placeholder="—"
                      title={produto.estoque == null ? "Nunca sincronizado com o Tiny" : undefined}
                      onBlur={(e) => {
                        const valor = Number(e.target.value);
                        if (Number.isFinite(valor) && valor >= 0 && valor !== produto.estoque) {
                          setEstoque.mutate({ sku: produto.sku, quantidade: valor });
                        }
                      }}
                    />
                  </td>
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
          </div>
        )}
      </section>
    </div>
  );
}

function SincronizarTinySection() {
  const importarCatalogo = useImportarCatalogoTiny();
  const sincronizarLote = useSincronizarEstoqueLote();
  const [erro, setErro] = useState<string | null>(null);
  const [resultadoCatalogo, setResultadoCatalogo] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

  function handleSincronizarCatalogo() {
    setErro(null);
    setResultadoCatalogo(null);
    importarCatalogo.mutate(undefined, {
      onSuccess: (r) => {
        setResultadoCatalogo(
          `${r.importados} produto(s) novo(s) importado(s) (de ${r.classificados} classificados como rolinho/placa ` +
            `entre os ${r.totalNoTiny} produtos do catálogo do Tiny; ${r.naoClassificados} não são rolinho/placa e ` +
            `foram ignorados). ${r.jaExistiam} já existiam; custo preenchido automaticamente em ${r.custoPreenchido} ` +
            `produto(s). Agora clique em "Sincronizar estoque" pra puxar as quantidades.`,
        );
      },
      onError: (error) =>
        setErro(
          error instanceof ApiError && error.status === 503
            ? "Integração com o Tiny não configurada."
            : "Falha ao importar catálogo do Tiny.",
        ),
    });
  }

  async function handleSincronizarEstoque() {
    setErro(null);
    let cursor: string | null = null;
    let feitos = 0;
    let total = 0;
    let bloqueiosSeguidos = 0;
    setProgresso({ feitos: 0, total: 0 });
    // Em lotes (não é mais uma única requisição gigante): cada chamada processa até
    // 100 produtos e volta rápido, então dá pra ver progresso e não trava em timeout
    // de proxy no meio de um catálogo com milhares de SKUs.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let resultado;
      try {
        resultado = await sincronizarLote.mutateAsync(cursor);
      } catch (error) {
        setErro(
          error instanceof ApiError && error.status === 503
            ? "Integração com o Tiny não configurada."
            : "Falha ao sincronizar estoque — tentando de novo é seguro, retoma de onde parou.",
        );
        return;
      }
      feitos += resultado.processados;
      total = resultado.totalElegiveis;
      setProgresso({ feitos, total });
      cursor = resultado.proximoCursor;
      if (resultado.bloqueado) {
        bloqueiosSeguidos++;
        if (bloqueiosSeguidos >= 3) {
          setErro(
            "O Tiny bloqueou por excesso de chamadas e continua bloqueado após algumas tentativas — espere " +
              "alguns minutos e clique em \"Sincronizar estoque\" de novo (retoma de onde parou).",
          );
          return;
        }
        // O Tiny avisa "aguarde alguns minutos" — 90s de pausa antes de tentar de novo,
        // bem mais que a pausa normal entre itens, pra não continuar batendo no bloqueio.
        await new Promise((resolve) => setTimeout(resolve, 90_000));
      } else {
        bloqueiosSeguidos = 0;
      }
      if (!cursor) break;
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Sincronizar com o Tiny</h2>
      <p className="mb-3 text-xs text-slate-500">
        Dois passos separados: (1) puxa o catálogo inteiro do Tiny, classifica em rolinho/placa e cadastra os que
        ainda não existem — rápido, dezenas de segundos; (2) sincroniza o estoque de cada produto já cadastrado —
        mais lento (o Tiny limita quantas consultas por segundo), então roda em lotes com progresso visível em vez
        de uma requisição só. Interromper e clicar de novo é seguro — retoma de onde parou, não duplica.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSincronizarCatalogo}
          disabled={importarCatalogo.isPending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {importarCatalogo.isPending ? "Importando catálogo..." : "1. Importar catálogo"}
        </button>
        <button
          onClick={handleSincronizarEstoque}
          disabled={sincronizarLote.isPending}
          className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {sincronizarLote.isPending ? "Sincronizando estoque..." : "2. Sincronizar estoque"}
        </button>
      </div>
      {progresso && progresso.total > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-teal-600 transition-all"
              style={{ width: `${Math.min(100, (progresso.feitos / progresso.total) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {progresso.feitos} de {progresso.total} produtos sincronizados
            {!sincronizarLote.isPending && progresso.feitos >= progresso.total && " — concluído."}
          </p>
        </div>
      )}
      {resultadoCatalogo && <p className="mt-2 text-sm text-green-700">{resultadoCatalogo}</p>}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}

function NovoProdutoSection() {
  const createProduto = useCreateProduto();
  const [form, setForm] = useState({ sku: "", descricao: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [buscaTiny, setBuscaTiny] = useState("");
  const buscaTinyDebounced = useDebounced(buscaTiny);
  const { data: resultadoBusca, isFetching: buscandoTiny, error: erroTiny } = useTinyProdutos(buscaTinyDebounced);
  const tinyNaoConfigurado = erroTiny instanceof ApiError && erroTiny.status === 503;

  function selecionarProdutoTiny(produto: TinyProduto) {
    setForm({ ...form, sku: produto.sku, descricao: produto.nome });
    setBuscaTiny("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createProduto.mutate(
      { sku: form.sku, descricao: form.descricao || undefined },
      {
        onSuccess: () => setForm({ sku: "", descricao: "" }),
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao cadastrar produto"),
      },
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Novo produto (avulso)</h2>

      <div className="relative mb-3">
        <label className={labelClass}>Buscar no Tiny (preenche SKU e descrição)</label>
        <input
          className={inputClass}
          value={buscaTiny}
          onChange={(e) => setBuscaTiny(e.target.value)}
          placeholder="Digite ao menos 2 letras do código ou nome..."
        />
        {buscandoTiny && <p className="mt-1 text-xs text-slate-500">Buscando...</p>}
        {tinyNaoConfigurado && (
          <p className="mt-1 text-xs text-amber-600">Integração com o Tiny não configurada — cadastre manualmente.</p>
        )}
        {erroTiny && !tinyNaoConfigurado && (
          <p className="mt-1 text-xs text-red-600">Falha ao buscar no Tiny — cadastre manualmente.</p>
        )}
        {!!resultadoBusca?.produtos.length && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-md">
            {resultadoBusca.produtos.map((produto) => (
              <li key={produto.tinyId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                  onClick={() => selecionarProdutoTiny(produto)}
                >
                  <span>
                    <span className="font-medium">{produto.sku}</span> — {produto.nome}
                  </span>
                  {produto.tipoSugerido && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {capitalizar(produto.tipoSugerido)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {resultadoBusca && resultadoBusca.produtos.length === 0 && buscaTinyDebounced.trim().length >= 2 && !buscandoTiny && (
          <p className="mt-1 text-xs text-slate-500">Nenhum produto encontrado no Tiny para essa busca.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>SKU *</label>
          <input required className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição</label>
          <input className={inputClass} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={createProduto.isPending}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createProduto.isPending ? "Salvando..." : "Cadastrar produto"}
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-slate-500">
        O tipo (rolinho/placa) é calculado automaticamente pelo SKU — edite na tabela abaixo se precisar corrigir.
      </p>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
