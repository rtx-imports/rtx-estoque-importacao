import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useCreateProduto,
  useGerarPedido,
  useParametros,
  useProdutos,
  useProposta,
  useSetEmTransito,
  useSetEstoque,
  useSetParametro,
} from "../api/compra";
import { useFornecedores } from "../api/fornecedores";
import type { PropostaItem } from "../api/types";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const smallInputClass = "w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

export function CompraPage() {
  const navigate = useNavigate();
  const { data: fornecedores } = useFornecedores(true);
  const [fornecedorId, setFornecedorId] = useState("");

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className={labelClass}>Fornecedor</label>
        <select className={inputClass} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
          <option value="">Selecione um fornecedor...</option>
          {fornecedores?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </section>

      {fornecedorId && <ParametrosSection />}
      {fornecedorId && <NovoProdutoForm fornecedorId={fornecedorId} />}
      {fornecedorId && <PropostaSection fornecedorId={fornecedorId} onPedidoGerado={(id) => navigate(`/pedidos/${id}`)} />}
    </div>
  );
}

function ParametrosSection() {
  const { data: parametros } = useParametros();
  const setParametro = useSetParametro();
  const [aberto, setAberto] = useState(false);

  if (!parametros) return null;

  const campos: { chave: string; label: string; valor: number }[] = [
    { chave: "lead_time_dias", label: "Lead time (dias)", valor: parametros.leadTimeDias },
    { chave: "cobertura_alvo_dias", label: "Cobertura alvo (dias)", valor: parametros.coberturaAlvoDias },
    { chave: "cambio", label: "Câmbio", valor: parametros.cambio },
    { chave: "janela_meses", label: "Janela de venda (meses)", valor: parametros.janelaMeses },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <button onClick={() => setAberto(!aberto)} className="text-sm font-semibold text-slate-800">
        Parâmetros do cálculo {aberto ? "▲" : "▼"}
      </button>
      {aberto && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campos.map((campo) => (
            <div key={campo.chave}>
              <label className={labelClass}>{campo.label}</label>
              <input
                type="number"
                step="any"
                className={inputClass}
                defaultValue={campo.valor}
                onBlur={(e) => {
                  const valor = e.target.value;
                  if (valor && Number(valor) !== campo.valor) {
                    setParametro.mutate({ chave: campo.chave, valor });
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NovoProdutoForm({ fornecedorId }: { fornecedorId: string }) {
  const createProduto = useCreateProduto();
  const [form, setForm] = useState({ sku: "", descricao: "", unidades_por_caixa: "1", custo_unit_usd: "0" });
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createProduto.mutate(
      {
        sku: form.sku,
        descricao: form.descricao || undefined,
        fornecedor_id: fornecedorId,
        unidades_por_caixa: Number(form.unidades_por_caixa),
        custo_unit_usd: Number(form.custo_unit_usd),
      },
      {
        onSuccess: () => setForm({ sku: "", descricao: "", unidades_por_caixa: "1", custo_unit_usd: "0" }),
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao cadastrar produto"),
      },
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Novo produto</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div>
          <label className={labelClass}>SKU *</label>
          <input required className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição</label>
          <input className={inputClass} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Unid./caixa</label>
          <input
            type="number"
            className={inputClass}
            value={form.unidades_por_caixa}
            onChange={(e) => setForm({ ...form, unidades_por_caixa: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Custo unit. (USD)</label>
          <input
            type="number"
            step="any"
            className={inputClass}
            value={form.custo_unit_usd}
            onChange={(e) => setForm({ ...form, custo_unit_usd: e.target.value })}
          />
        </div>
        <div className="sm:col-span-5">
          <button
            type="submit"
            disabled={createProduto.isPending}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createProduto.isPending ? "Salvando..." : "Cadastrar produto"}
          </button>
        </div>
      </form>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}

function PropostaSection({ fornecedorId, onPedidoGerado }: { fornecedorId: string; onPedidoGerado: (id: string) => void }) {
  const { data: produtos } = useProdutos(fornecedorId);
  const { data: proposta, isLoading } = useProposta(fornecedorId);
  const setEstoque = useSetEstoque();
  const setTransito = useSetEmTransito();
  const gerarPedido = useGerarPedido();

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  if (!produtos?.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Nenhum produto cadastrado para este fornecedor ainda.</p>
      </section>
    );
  }
  if (isLoading || !proposta) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Calculando proposta...</p>
      </section>
    );
  }

  function necessidadeEfetiva(item: PropostaItem): number {
    const override = overrides[item.sku];
    if (override !== undefined && override !== "") return Number(override);
    return item.necessidade;
  }

  function handleGerarPedido() {
    setErro(null);
    const overridesNumericos: Record<string, number> = {};
    for (const [sku, valor] of Object.entries(overrides)) {
      if (valor !== "") overridesNumericos[sku] = Number(valor);
    }
    gerarPedido.mutate(
      { fornecedorId, overrides: overridesNumericos },
      {
        onSuccess: (pedido) => onPedidoGerado(pedido.id),
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao gerar pedido"),
      },
    );
  }

  const totalNecessidade = proposta.itens.reduce((soma, item) => soma + necessidadeEfetiva(item), 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Proposta de compra</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <th className="py-2">SKU</th>
            <th className="py-2">Descrição</th>
            <th className="py-2 text-right">Demanda/mês</th>
            <th className="py-2 text-right">Estoque</th>
            <th className="py-2 text-right">Trânsito</th>
            <th className="py-2 text-right">Necessidade</th>
          </tr>
        </thead>
        <tbody>
          {proposta.itens.map((item) => (
            <tr key={item.sku} className="border-b border-slate-100">
              <td className="py-2">{item.sku}</td>
              <td className="py-2">{item.descricao}</td>
              <td className="py-2 text-right">{item.demandaPicoMensal}</td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className={smallInputClass}
                  defaultValue={item.estoque}
                  onBlur={(e) => {
                    const valor = Number(e.target.value);
                    if (Number.isFinite(valor) && valor !== item.estoque) {
                      setEstoque.mutate({ sku: item.sku, quantidade: valor });
                    }
                  }}
                />
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className={smallInputClass}
                  defaultValue={item.transito}
                  onBlur={(e) => {
                    const valor = Number(e.target.value);
                    if (Number.isFinite(valor) && valor !== item.transito) {
                      setTransito.mutate({ sku: item.sku, quantidade: valor });
                    }
                  }}
                />
              </td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  className={smallInputClass + " font-semibold"}
                  placeholder={String(item.necessidade)}
                  value={overrides[item.sku] ?? ""}
                  onChange={(e) => setOverrides({ ...overrides, [item.sku]: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="pt-3 text-right text-sm font-medium text-slate-600">
              Total a comprar:
            </td>
            <td className="pt-3 text-right text-sm font-semibold text-slate-800">{totalNecessidade}</td>
          </tr>
        </tfoot>
      </table>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleGerarPedido}
          disabled={gerarPedido.isPending || totalNecessidade <= 0}
          className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {gerarPedido.isPending ? "Gerando..." : "Gerar pedido"}
        </button>
      </div>
    </section>
  );
}
