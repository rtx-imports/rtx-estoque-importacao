import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useCreateProduto,
  useGerarPedido,
  useParametros,
  useProdutos,
  useProposta,
  useSetEstoque,
  useSetParametro,
} from "../api/compra";
import { useFornecedores } from "../api/fornecedores";
import { useTinyProdutos } from "../api/tiny";
import type { Fornecedor, PropostaItem, TinyProduto, TipoProduto } from "../api/types";

const TIPO_LABEL: Record<TipoProduto, string> = { rolinho: "Rolinho", placa: "Placa" };

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const smallInputClass = "w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

function useDebounced<T>(valor: T, atrasoMs = 350): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return debounced;
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function mesLabel(k: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + k);
  return `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

type TipoTab = "rolinho" | "placa" | "outros";
const TABS: { tipo: TipoTab; label: string }[] = [
  { tipo: "rolinho", label: "Rolinhos" },
  { tipo: "placa", label: "Placas" },
];

export function CompraPage() {
  const navigate = useNavigate();
  const { data: fornecedores } = useFornecedores(true);
  const [tab, setTab] = useState<TipoTab>("rolinho");
  const [fornecedorId, setFornecedorId] = useState("");

  const outrosExistem = (fornecedores ?? []).some((f) => !f.tipo_produto_padrao);
  const abas = outrosExistem ? [...TABS, { tipo: "outros" as TipoTab, label: "Outros" }] : TABS;
  const fornecedoresDoTab = (fornecedores ?? []).filter((f) =>
    tab === "outros" ? !f.tipo_produto_padrao : f.tipo_produto_padrao === tab,
  );

  useEffect(() => {
    setFornecedorId(fornecedoresDoTab.length === 1 ? fornecedoresDoTab[0].id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fornecedores?.length]);

  const fornecedor = fornecedoresDoTab.find((f) => f.id === fornecedorId);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex gap-1">
          {abas.map((aba) => (
            <button
              key={aba.tipo}
              onClick={() => setTab(aba.tipo)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (tab === aba.tipo ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {aba.label}
            </button>
          ))}
        </div>

        {fornecedoresDoTab.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhum fornecedor cadastrado como "{abas.find((a) => a.tipo === tab)?.label}" ainda — ajuste o "Tipo de
            produto padrão" na tela de Fornecedores.
          </p>
        )}
        {fornecedoresDoTab.length > 1 && (
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select className={inputClass} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione um fornecedor...</option>
              {fornecedoresDoTab.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {fornecedoresDoTab.length === 1 && (
          <p className="text-sm text-slate-600">
            Fornecedor: <span className="font-medium">{fornecedoresDoTab[0].nome}</span>
          </p>
        )}
      </section>

      {fornecedor && <ParametrosSection />}
      {fornecedor && <NovoProdutoForm fornecedor={fornecedor} />}
      {fornecedor && (
        <PropostaSection fornecedorId={fornecedor.id} onPedidoGerado={(id) => navigate(`/pedidos/${id}`)} />
      )}
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
    { chave: "cobertura_minima_meses", label: "Cobertura mínima (meses)", valor: parametros.coberturaMinimaMeses },
    { chave: "crescimento_mensal", label: "Crescimento mensal (fator, ex: 1.10 = +10%)", valor: parametros.crescimentoMensal },
    { chave: "cambio", label: "Câmbio", valor: parametros.cambio },
    { chave: "janela_meses", label: "Janela de venda (meses)", valor: parametros.janelaMeses },
  ];

  const cambioDesatualizado =
    !parametros.cambioAtualizadoEm ||
    Date.now() - new Date(parametros.cambioAtualizadoEm).getTime() > 24 * 60 * 60 * 1000;

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
              {campo.chave === "cambio" && (
                <div className="mt-1 space-y-0.5 text-xs">
                  <p className="text-slate-500">Comparar cotação comercial entre Santander e Banco do Brasil.</p>
                  <p className="text-slate-500">
                    PTAX BCB (referência):{" "}
                    {parametros.ptaxReferencia
                      ? `R$ ${parametros.ptaxReferencia.valor.toFixed(4)} (${formatarData(parametros.ptaxReferencia.data)})`
                      : "indisponível"}
                  </p>
                  <p className={cambioDesatualizado ? "font-medium text-amber-600" : "text-slate-500"}>
                    {parametros.cambioAtualizadoEm
                      ? `Ajustado em ${formatarDataHora(parametros.cambioAtualizadoEm)}${
                          cambioDesatualizado ? " — confira se ainda vale" : ""
                        }`
                      : "Nunca ajustado manualmente — usando valor padrão do sistema"}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NovoProdutoForm({ fornecedor }: { fornecedor: Fornecedor }) {
  const createProduto = useCreateProduto();
  const [form, setForm] = useState({ sku: "", descricao: "", unidades_por_caixa: "1", custo_unit_usd: "0" });
  const [erro, setErro] = useState<string | null>(null);
  const [avisoTipo, setAvisoTipo] = useState<string | null>(null);
  const [buscaTiny, setBuscaTiny] = useState("");
  const [mostrarTodosTiny, setMostrarTodosTiny] = useState(false);
  const buscaTinyDebounced = useDebounced(buscaTiny);
  const { data: produtosTiny, isFetching: buscandoTiny, error: erroTiny } = useTinyProdutos(buscaTinyDebounced);
  const tinyNaoConfigurado = erroTiny instanceof ApiError && erroTiny.status === 503;

  const tipoEsperado = fornecedor.tipo_produto_padrao;
  const resultadosDivergentes = tipoEsperado
    ? (produtosTiny ?? []).filter((p) => p.tipoSugerido && p.tipoSugerido !== tipoEsperado)
    : [];
  const resultadosExibidos =
    !tipoEsperado || mostrarTodosTiny
      ? produtosTiny
      : produtosTiny?.filter((p) => !p.tipoSugerido || p.tipoSugerido === tipoEsperado);

  function selecionarProdutoTiny(produto: TinyProduto) {
    setForm({ ...form, sku: produto.sku, descricao: produto.nome });
    setBuscaTiny("");
    setMostrarTodosTiny(false);
    setAvisoTipo(
      tipoEsperado && produto.tipoSugerido && produto.tipoSugerido !== tipoEsperado
        ? `Atenção: pelo código, esse SKU parece ser "${TIPO_LABEL[produto.tipoSugerido]}", mas ${fornecedor.nome} costuma vender "${TIPO_LABEL[tipoEsperado]}". Confira antes de salvar.`
        : null,
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    createProduto.mutate(
      {
        sku: form.sku,
        descricao: form.descricao || undefined,
        fornecedor_id: fornecedor.id,
        unidades_por_caixa: Number(form.unidades_por_caixa),
        custo_unit_usd: Number(form.custo_unit_usd),
      },
      {
        onSuccess: () => {
          setForm({ sku: "", descricao: "", unidades_por_caixa: "1", custo_unit_usd: "0" });
          setAvisoTipo(null);
        },
        onError: (error) =>
          setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao cadastrar produto"),
      },
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Novo produto</h2>

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
        {!!resultadosExibidos?.length && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-md">
            {resultadosExibidos.map((produto) => (
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
                      {TIPO_LABEL[produto.tipoSugerido]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {produtosTiny && produtosTiny.length === 0 && buscaTinyDebounced.trim().length >= 2 && !buscandoTiny && (
          <p className="mt-1 text-xs text-slate-500">Nenhum produto encontrado no Tiny para essa busca.</p>
        )}
        {!mostrarTodosTiny && resultadosDivergentes.length > 0 && (
          <button
            type="button"
            className="mt-1 text-xs text-blue-600 hover:underline"
            onClick={() => setMostrarTodosTiny(true)}
          >
            {resultadosDivergentes.length} resultado(s) de outro tipo ocultado(s) — mostrar todos
          </button>
        )}
      </div>

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
      {avisoTipo && <p className="mt-2 text-sm text-amber-600">{avisoTipo}</p>}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}

/** "Revisar" (vermelho) até 3 meses pra acabar, "Repor" (amber) até 5, senão "Ok". Mesmos limiares
 * usados na coloração da coluna "Acaba em" da referência (rtx-pedidos). */
type StatusLinha = "ok" | "repor" | "revisar" | "semgiro";
function statusLinha(item: PropostaItem): StatusLinha {
  if (item.acabaTipo === "semgiro") return "semgiro";
  if (item.acabaTipo === "acima12") return "ok";
  const k = item.acabaMeses ?? 99;
  if (k <= 3) return "revisar";
  if (k <= 5) return "repor";
  return "ok";
}
const STATUS_BADGE: Record<StatusLinha, string> = {
  ok: "bg-green-100 text-green-700",
  repor: "bg-amber-100 text-amber-700",
  revisar: "bg-red-100 text-red-700",
  semgiro: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<StatusLinha, string> = { ok: "Ok", repor: "Repor", revisar: "Revisar", semgiro: "Sem giro" };

function acabaLabel(item: PropostaItem): string {
  if (item.acabaTipo === "semgiro") return "Sem giro";
  if (item.acabaTipo === "acima12") return ">12 meses";
  return mesLabel(item.acabaMeses ?? 0);
}

function acabaClasse(item: PropostaItem): string {
  if (item.acabaTipo !== "mes") return "text-slate-400";
  const k = item.acabaMeses ?? 99;
  if (k <= 3) return "font-bold text-red-600";
  if (k <= 5) return "font-semibold text-amber-600";
  return "text-slate-600";
}

function PropostaSection({ fornecedorId, onPedidoGerado }: { fornecedorId: string; onPedidoGerado: (id: string) => void }) {
  const { data: produtos } = useProdutos(fornecedorId);
  const { data: proposta, isLoading } = useProposta(fornecedorId);
  const setEstoque = useSetEstoque();
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
  const meses = proposta.itens[0]?.plan.map((_, m) => m) ?? [0, 1, 2, 3, 4, 5, 6];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">Proposta de compra</h2>
      <p className="mb-3 text-xs text-slate-500">
        Cada coluna mensal é quanto pedir naquele mês, considerando lead time e crescimento esperado — só o mês
        atual (destacado) vira pedido agora.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Descrição</th>
              <th className="py-2 pr-3 text-right">Demanda/mês</th>
              <th className="py-2 pr-3 text-right">Estoque</th>
              <th className="py-2 pr-3 text-right">Trânsito</th>
              <th className="py-2 pr-3 text-right">Acaba em</th>
              <th className="py-2 pr-3">Status</th>
              {meses.map((m) => (
                <th key={m} className={"py-2 pr-3 text-right " + (m === 0 ? "text-slate-800" : "")}>
                  {mesLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposta.itens.map((item) => (
              <tr key={item.sku} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-medium">{item.sku}</td>
                <td className="py-2 pr-3">{item.descricao}</td>
                <td className="py-2 pr-3 text-right">{item.demandaPicoMensal}</td>
                <td className="py-2 pr-3 text-right">
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
                <td
                  className="py-2 pr-3 text-right text-slate-600"
                  title="Calculado a partir dos pedidos embarcados/aguardando desembaraço/em desova/conferência — não editável"
                >
                  {item.transito}
                </td>
                <td className={"py-2 pr-3 text-right " + acabaClasse(item)}>{acabaLabel(item)}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[statusLinha(item)]}`}>
                    {STATUS_LABEL[statusLinha(item)]}
                  </span>
                </td>
                {item.plan.map((qtd, m) =>
                  m === 0 ? (
                    <td key={m} className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        min={0}
                        className={smallInputClass + " font-semibold"}
                        placeholder={String(item.necessidade)}
                        value={overrides[item.sku] ?? ""}
                        onChange={(e) => setOverrides({ ...overrides, [item.sku]: e.target.value })}
                      />
                    </td>
                  ) : (
                    <td key={m} className="py-2 pr-3 text-right text-slate-500">
                      {qtd > 0 ? new Intl.NumberFormat("pt-BR").format(qtd) : "·"}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="pt-3 text-right text-sm font-medium text-slate-600">
                Total a pedir agora ({mesLabel(0)}):
              </td>
              <td className="pt-3 text-right text-sm font-semibold text-slate-800">{totalNecessidade}</td>
              <td colSpan={Math.max(meses.length - 1, 0)}></td>
            </tr>
          </tfoot>
        </table>
      </div>

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
