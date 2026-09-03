import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useGerarPedido, useParametros, useProposta, useSetEstoque, useSetParametro } from "../api/compra";
import { useFornecedores } from "../api/fornecedores";
import { useTiposProduto } from "../api/tiposProduto";
import type { PropostaItem } from "../api/types";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

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

/** Sentinela pra fornecedores sem nenhum tipo_produto cadastrado — não é um tipo de verdade. */
const TAB_OUTROS = "outros";

function capitalizar(texto: string): string {
  return texto.length ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

export function CompraPage() {
  const navigate = useNavigate();
  const { data: fornecedores } = useFornecedores(true);
  const { data: tiposProduto } = useTiposProduto();
  const [tab, setTab] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  const outrosExistem = (fornecedores ?? []).some((f) => f.tipos_produto.length === 0);
  const abas = [
    ...(tiposProduto ?? []).map((t) => ({ tipo: t.nome, label: capitalizar(t.nome) + "s" })),
    ...(outrosExistem ? [{ tipo: TAB_OUTROS, label: "Outros" }] : []),
  ];
  const fornecedoresDoTab = (fornecedores ?? []).filter((f) =>
    tab === TAB_OUTROS ? f.tipos_produto.length === 0 : f.tipos_produto.includes(tab),
  );

  useEffect(() => {
    if (abas.length && !abas.some((a) => a.tipo === tab)) setTab(abas[0].tipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposProduto?.length, outrosExistem]);

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
    {
      chave: "estoque_critico_dias",
      label: "Estoque crítico (dias)",
      valor: parametros.estoqueCriticoDias,
    },
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

/** "Revisar" (vermelho) até 3 meses pra acabar, "Repor" (amber) até 5, senão "Ok". Mesmos limiares
 * usados na coloração da coluna "Acaba em" da referência (rtx-pedidos). Vira uma borda colorida na
 * célula "Item Code / Descrição" — mesmo padrão visual da referência (tick lateral), não uma coluna. */
type StatusLinha = "ok" | "repor" | "revisar" | "semgiro";
function statusLinha(item: PropostaItem): StatusLinha {
  if (item.acabaTipo === "semgiro") return "semgiro";
  if (item.acabaTipo === "acima12") return "ok";
  const k = item.acabaMeses ?? 99;
  if (k <= 3) return "revisar";
  if (k <= 5) return "repor";
  return "ok";
}
const STATUS_BORDA: Record<StatusLinha, string> = {
  ok: "border-l-emerald-600",
  repor: "border-l-amber-500",
  revisar: "border-l-red-600",
  semgiro: "border-l-slate-300",
};
const STATUS_LABEL: Record<StatusLinha, string> = { ok: "Ok", repor: "Repor", revisar: "Revisar", semgiro: "Sem giro" };

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatarBRL(valor: number): string {
  return brlFormatter.format(valor);
}

function formatarMetros(valor: number | null): string {
  return valor == null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}m`;
}

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

const thClass =
  "sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-200 bg-white px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400";
const tdClass = "whitespace-nowrap border-b border-r border-slate-100 px-2 py-1 text-right";
const tdValorClass = tdClass + " bg-teal-50/60 text-teal-700";

function PropostaSection({ fornecedorId, onPedidoGerado }: { fornecedorId: string; onPedidoGerado: (id: string) => void }) {
  const { data: proposta, isLoading } = useProposta(fornecedorId);
  const setEstoque = useSetEstoque();
  const gerarPedido = useGerarPedido();

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading || !proposta) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Calculando proposta...</p>
      </section>
    );
  }
  if (!proposta.itens.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Nenhum produto desse tipo cadastrado ainda — cadastre na aba Produtos.
        </p>
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

  const buscaLower = busca.trim().toLowerCase();
  const itensVisiveis = buscaLower
    ? proposta.itens.filter(
        (item) => item.sku.toLowerCase().includes(buscaLower) || item.descricao.toLowerCase().includes(buscaLower),
      )
    : proposta.itens;

  const totalNecessidade = itensVisiveis.reduce((soma, item) => soma + necessidadeEfetiva(item), 0);
  const cambio = proposta.params.cambio;
  const meses = proposta.itens[0]?.plan.map((_, m) => m) ?? [0, 1, 2, 3, 4, 5, 6];
  const totalColunas = 13 + meses.length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Proposta de compra</h2>
          <p className="text-xs text-slate-500">
            Cada coluna mensal é quanto pedir naquele mês, considerando lead time e crescimento esperado — só o
            mês atual (destacado) vira pedido agora.
          </p>
        </div>
        <div className="w-64">
          <input
            className="font-planilha w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="⌕ Buscar SKU ou descrição..."
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-md border border-slate-200">
        <table className="font-planilha w-max min-w-full border-collapse text-[12.5px] tabular-nums">
          <thead>
            <tr>
              <th className={thClass + " text-left"}>Item Code / Descrição</th>
              <th className={thClass}>Width</th>
              <th className={thClass}>Length</th>
              <th className={thClass} title="Unidades por caixa">
                Quantity
              </th>
              <th className={thClass + " bg-teal-50/60"} title="Aproximado: demanda de pico mensal × custo × câmbio">
                CMV 30d
              </th>
              <th className={thClass}>SKU importado</th>
              <th className={thClass}>Estoque Atual</th>
              <th className={thClass + " bg-teal-50/60"}>Valor Atual</th>
              <th className={thClass} title="Estoque em centros de fulfillment (ML/Shopee) — não integrado ainda">
                Estoque Full
              </th>
              <th className={thClass + " bg-teal-50/60"}>Valor Full</th>
              <th className={thClass}>Em trânsito</th>
              <th className={thClass + " bg-teal-50/60"}>Valor Trânsito</th>
              <th className={thClass}>Acaba Em</th>
              {meses.map((m) => (
                <th key={m} className={thClass + (m === 0 ? " bg-teal-50" : "")}>
                  {mesLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itensVisiveis.map((item) => {
              const valorAtual = item.estoque * item.custoAtualUsd * cambio;
              const valorTransito = item.transito * item.custoTransitoUsd * cambio;
              const cmv30d = item.demandaPicoMensal * item.custoUnitUsd * cambio;
              return (
                <tr key={item.sku} className="hover:bg-slate-50">
                  <td
                    className={`whitespace-normal border-b border-r border-slate-100 border-l-[3px] bg-white px-2.5 py-1 text-left align-middle ${STATUS_BORDA[statusLinha(item)]}`}
                    title={`Status: ${STATUS_LABEL[statusLinha(item)]}`}
                  >
                    <div className="font-medium text-slate-800">{item.sku}</div>
                    <div className="text-[11px] text-slate-500">{item.descricao}</div>
                  </td>
                  <td className={tdClass}>{formatarMetros(item.widthM)}</td>
                  <td className={tdClass}>{formatarMetros(item.lengthM)}</td>
                  <td className={tdClass}>{item.unidadesPorCaixa}</td>
                  <td className={tdValorClass}>{formatarBRL(cmv30d)}</td>
                  <td className={tdClass + " text-slate-500"}>{item.sku}</td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      min={0}
                      className="font-planilha w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right tabular-nums outline-none hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                      defaultValue={item.estoque}
                      onBlur={(e) => {
                        const valor = Number(e.target.value);
                        if (Number.isFinite(valor) && valor !== item.estoque) {
                          setEstoque.mutate({ sku: item.sku, quantidade: valor });
                        }
                      }}
                    />
                  </td>
                  <td className={tdValorClass}>{formatarBRL(valorAtual)}</td>
                  <td className={tdClass + " text-slate-400"} title="Não integrado ainda">
                    —
                  </td>
                  <td className={tdValorClass + " text-slate-400"}>—</td>
                  <td
                    className={tdClass}
                    title="Calculado a partir dos pedidos embarcados/aguardando desembaraço/em desova/conferência — não editável"
                  >
                    {item.transito}
                  </td>
                  <td className={tdValorClass}>{formatarBRL(valorTransito)}</td>
                  <td className={tdClass + " " + acabaClasse(item)}>{acabaLabel(item)}</td>
                  {item.plan.map((qtd, m) =>
                    m === 0 ? (
                      <td key={m} className={tdClass + " bg-teal-50"}>
                        <input
                          type="number"
                          min={0}
                          className="font-planilha w-16 rounded border border-slate-300 px-1 py-0.5 text-right font-semibold tabular-nums outline-none focus:border-blue-500"
                          placeholder={String(item.necessidade)}
                          value={overrides[item.sku] ?? ""}
                          onChange={(e) => setOverrides({ ...overrides, [item.sku]: e.target.value })}
                        />
                      </td>
                    ) : (
                      <td key={m} className={tdClass + " text-slate-500"} title={`pedir em ${mesLabel(m)}`}>
                        {qtd > 0 ? new Intl.NumberFormat("pt-BR").format(qtd) : "·"}
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
            {!itensVisiveis.length && (
              <tr>
                <td colSpan={totalColunas} className="px-3 py-4 text-center text-sm text-slate-400">
                  Nenhum produto encontrado para "{busca}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <div className="mt-4 flex items-center justify-between">
        <p className="font-planilha text-xs text-slate-500">
          Total a pedir agora ({mesLabel(0)}): <span className="font-semibold text-slate-800">{totalNecessidade}</span>
        </p>
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
