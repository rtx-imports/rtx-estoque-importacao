import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useParametros, useTodosProdutos } from "../api/compra";
import { api } from "../api/client";
import { useFornecedores } from "../api/fornecedores";
import { usePedidos } from "../api/pedidos";
import { PEDIDO_STATUS, PEDIDO_STATUS_LABEL, type Proposta } from "../api/types";
import { formatarDataHora } from "./decisaoCompra/format";
import { COR_STATUS } from "./pedidos/statusColor";

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

/**
 * Início — painel consolidado do dia, reaproveitando dado que já existe em
 * outras telas (Decisão de Compra, Pedidos, câmbio, sincronização de
 * estoque), não uma fonte nova. Pedido de Beatriz em 04/09/2026, aprovado
 * num protótipo (Artifact "Sistema Visual RTX") antes de entrar aqui.
 * KPIs agregados somam a proposta de cada fornecedor ativo — não existe
 * endpoint de "proposta de todos", então isso é feito no cliente.
 */
export function InicioPage() {
  const { data: fornecedores } = useFornecedores(true);
  const { data: parametros } = useParametros();
  const { data: pedidos } = usePedidos();
  const { data: produtos } = useTodosProdutos();

  const propostas = useQueries({
    queries: (fornecedores ?? []).map((f) => ({
      queryKey: ["proposta", f.id],
      queryFn: () => api.get<Proposta>(`/proposta?fornecedor_id=${f.id}`),
      enabled: Boolean(fornecedores),
    })),
  });
  const propostasProntas = propostas.every((q) => q.isSuccess) && propostas.length > 0;
  const kpisAgregados = propostasProntas
    ? propostas.reduce(
        (acc, q) => {
          const k = q.data!.kpis;
          acc.produtosCriticos += k.produtosCriticos;
          acc.rupturasPrevistas += k.rupturasPrevistas;
          acc.saudeSoma += k.saudeEstoquePct;
          if (k.coberturaMediaDias != null) {
            acc.coberturaSoma += k.coberturaMediaDias;
            acc.coberturaCount += 1;
          }
          return acc;
        },
        { produtosCriticos: 0, rupturasPrevistas: 0, saudeSoma: 0, coberturaSoma: 0, coberturaCount: 0 },
      )
    : null;
  const saudeMedia = kpisAgregados ? Math.round(kpisAgregados.saudeSoma / propostas.length) : null;
  const coberturaMedia = kpisAgregados && kpisAgregados.coberturaCount > 0 ? Math.round(kpisAgregados.coberturaSoma / kpisAgregados.coberturaCount) : null;

  const totalProdutos = produtos?.length ?? 0;
  const produtosSincronizados = produtos?.filter((p) => p.estoque != null).length ?? 0;
  const pctSincronizado = totalProdutos > 0 ? Math.round((produtosSincronizados / totalProdutos) * 100) : 0;

  const contagemPorStatus = new Map<string, number>();
  for (const p of pedidos ?? []) {
    contagemPorStatus.set(p.status, (contagemPorStatus.get(p.status) ?? 0) + 1);
  }

  const cambioDesatualizado =
    !parametros?.cambioAtualizadoEm || horasDesde(parametros.cambioAtualizadoEm) > 24;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Início</h1>
        <p className="text-sm text-muted-rtx">
          Panorama do dia — cruza o que já existe em Decisão de Compra, Pedidos e câmbio num só lugar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile
          label="Saúde do estoque"
          valor={saudeMedia != null ? `${saudeMedia}%` : "—"}
          sub="SKUs sem risco de ruptura"
          tom={saudeMedia == null ? "text-ink" : saudeMedia >= 80 ? "text-emerald-600" : saudeMedia >= 50 ? "text-amber-600" : "text-red-600"}
        />
        <KpiTile
          label="Produtos críticos"
          valor={kpisAgregados ? String(kpisAgregados.produtosCriticos) : "—"}
          sub="ruptura em até 3 meses"
          tom={kpisAgregados && kpisAgregados.produtosCriticos > 0 ? "text-red-600" : "text-emerald-600"}
        />
        <KpiTile
          label="Rupturas previstas"
          valor={kpisAgregados ? String(kpisAgregados.rupturasPrevistas) : "—"}
          sub="dentro da janela de análise"
          tom={kpisAgregados && kpisAgregados.rupturasPrevistas > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <KpiTile
          label="Cobertura média"
          valor={coberturaMedia != null ? `${coberturaMedia} dias` : "—"}
          sub="estoque físico atual"
          tom="text-ink"
        />
        <div
          className="rounded-xl border border-dashed border-info bg-info-bg p-3.5"
          title="Módulo de Estoque consolidado por CNPJ ainda não existe (TODO.md) — reservado aqui pra quando existir"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-info">Estoque consolidado</p>
          <p className="num-tabular mt-1.5 text-lg font-semibold text-info">—</p>
          <p className="text-[11px] text-info">módulo ainda não existe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <section className="rounded-lg border border-border-rtx bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Pedidos por status</h2>
          <div className="space-y-2">
            {PEDIDO_STATUS.filter((s) => contagemPorStatus.has(s)).map((status) => (
              <div key={status} className="flex items-center gap-2.5 text-sm">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR_STATUS[status].coluna.split(" ")[0]}`} />
                <span className="flex-1 text-muted-rtx">{PEDIDO_STATUS_LABEL[status]}</span>
                <span className="num-tabular font-semibold text-ink">{contagemPorStatus.get(status)}</span>
              </div>
            ))}
            {!pedidos?.length && <p className="text-sm text-muted-rtx">Nenhum pedido ainda.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-border-rtx bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Câmbio</h2>
          {parametros ? (
            <>
              <p className="num-tabular text-xl font-bold text-emerald-600">
                US$ 1 = R$ {parametros.cambio.toFixed(4)}
              </p>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-rtx">
                {parametros.ptaxReferencia && <p>PTAX BCB: R$ {parametros.ptaxReferencia.valor.toFixed(4)}</p>}
                <p className={cambioDesatualizado ? "font-medium text-amber-600" : ""}>
                  {parametros.cambioAtualizadoEm
                    ? `Ajustado em ${formatarDataHora(parametros.cambioAtualizadoEm)}${cambioDesatualizado ? " — confira" : ""}`
                    : "Nunca ajustado manualmente"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-rtx">Carregando...</p>
          )}
        </section>

        <section className="rounded-lg border border-border-rtx bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Sincronização de estoque</h2>
          <div className="h-1.5 overflow-hidden rounded-full border border-border-rtx bg-paper">
            <div className="h-full bg-gold" style={{ width: `${pctSincronizado}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-rtx">
            <span>
              {produtosSincronizados} de {totalProdutos} produtos
            </span>
            <span className="num-tabular font-semibold text-ink">{pctSincronizado}%</span>
          </div>
          <p className="mt-2.5 text-xs text-muted-rtx">Rodando sozinho, 30 produtos/5min — sem ação necessária.</p>
        </section>
      </div>

      <section className="rounded-lg border border-dashed border-info bg-info-bg p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-info">Estoque por empresa</h2>
          <span className="text-xs text-info">RTX, BG, BW, BRA — cada uma com conta própria no Tiny</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["RTX", "BG", "BW", "BRA"].map((empresa) => (
            <div key={empresa} className="rounded-lg border border-dashed border-info bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-info">{empresa}</p>
              <p className="mt-1.5 text-lg font-semibold text-info">—</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-info">
          Separação por CNPJ ainda não existe (TODO.md — "Estoque consolidado por CNPJ", sessão própria).
        </p>
      </section>

      <section className="rounded-lg border border-border-rtx bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Atalhos</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/compra" className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark">
            Ir pra Decisão de Compra
          </Link>
          <Link to="/pedidos" className="rounded-md border border-border-rtx-strong px-4 py-1.5 text-sm font-medium text-ink hover:bg-paper">
            Ver Pedidos
          </Link>
          <Link to="/fornecedores" className="rounded-md border border-border-rtx-strong px-4 py-1.5 text-sm font-medium text-ink hover:bg-paper">
            Cadastrar Fornecedor
          </Link>
        </div>
      </section>
    </div>
  );
}

function KpiTile({ label, valor, sub, tom }: { label: string; valor: string; sub: string; tom: string }) {
  return (
    <div className="rounded-xl border border-border-rtx bg-white p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-rtx">{label}</p>
      <p className={`num-tabular mt-1.5 text-lg font-semibold ${tom}`}>{valor}</p>
      <p className="text-[11px] text-muted-rtx">{sub}</p>
    </div>
  );
}
