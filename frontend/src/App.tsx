import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clsx } from "clsx";
import { useParametros } from "./api/compra";
import { CompraPage } from "./pages/CompraPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import { EstoquePage } from "./pages/EstoquePage";
import { FornecedoresPage } from "./pages/FornecedoresPage";
import { InicioPage } from "./pages/InicioPage";
import { PedidoDetalhePage } from "./pages/PedidoDetalhePage";
import { PedidosPage } from "./pages/PedidosPage";
import { PrecosFornecedorPage } from "./pages/PrecosFornecedorPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { RastreamentoPage } from "./pages/RastreamentoPage";
import { UsuariosPage } from "./pages/UsuariosPage";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        clsx(
          "rounded-lg border-l-2 border-transparent px-3 py-2 text-[13.5px] font-medium text-slate-300",
          isActive ? "border-gold bg-navy-2 text-white" : "hover:bg-navy-2 hover:text-white",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function useRelogio() {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return agora;
}

function Relogio() {
  const agora = useRelogio();
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = agora.toLocaleTimeString("pt-BR");
  return (
    <div className="num-tabular text-xs text-muted-rtx">
      <span className="capitalize">{data}</span> <span className="font-medium text-ink">{hora}</span>
    </div>
  );
}

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

/** Câmbio sempre visível no cabeçalho (pedido de Beatriz — antes só aparecia
 * dentro de "Parâmetros do cálculo", uma seção recolhida da Decisão de
 * Compra, fácil de esquecer de checar). É o valor MANUAL (decisão 18 do
 * DECISIONS.md — cotação comercial, não o PTAX) — o PTAX do BCB aparece do
 * lado só como referência. Fica âmbar quando o câmbio manual passa de 24h
 * sem ajuste, mesmo limiar já usado dentro de Parâmetros. */
function CambioIndicador() {
  const { data: parametros } = useParametros();
  if (!parametros) return null;

  const desatualizado = !parametros.cambioAtualizadoEm || horasDesde(parametros.cambioAtualizadoEm) > 24;
  const horasAtras = parametros.cambioAtualizadoEm ? Math.round(horasDesde(parametros.cambioAtualizadoEm)) : null;

  return (
    <NavLink
      to="/compra"
      title={
        parametros.cambioAtualizadoEm
          ? `Câmbio ajustado manualmente há ${horasAtras}h — clique pra ajustar em Parâmetros do cálculo`
          : "Câmbio nunca ajustado manualmente — usando valor padrão do sistema"
      }
      className={clsx(
        "num-tabular flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold",
        desatualizado ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700",
      )}
    >
      <span>US$ 1 = R$ {parametros.cambio.toFixed(4)}</span>
      {parametros.ptaxReferencia && (
        <span className="font-normal text-muted-rtx">
          (PTAX {parametros.ptaxReferencia.valor.toFixed(4)})
        </span>
      )}
      {desatualizado && <span>⚠</span>}
    </NavLink>
  );
}

export function App() {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="sticky top-0 flex h-screen flex-col gap-6 bg-navy px-3.5 py-5">
        <div className="flex flex-col items-center gap-2.5 px-2 pb-1 pt-1">
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm">
            <img src="/logo-rtx.png" alt="RTX Imports" className="h-[54px] w-auto" />
          </div>
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-rtx">Estoque &amp; Importação</div>
        </div>

        <nav className="flex flex-col gap-0.5">
          <NavItem to="/">Início</NavItem>
        </nav>
        <nav className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1 text-[10.5px] uppercase tracking-[0.1em] text-muted-rtx">Compras</div>
          <NavItem to="/compra">Decisão de Compra</NavItem>
          <NavItem to="/pedidos">Pedidos</NavItem>
          <NavItem to="/rastreamento">Rastreamento de Carga</NavItem>
          <NavItem to="/fornecedores">Fornecedores</NavItem>
          <NavItem to="/precos">Preços por Fornecedor</NavItem>
          <NavItem to="/produtos">Produtos</NavItem>
        </nav>
        <nav className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1 text-[10.5px] uppercase tracking-[0.1em] text-muted-rtx">Estoque</div>
          <NavItem to="/estoque">Visão Geral</NavItem>
        </nav>
        <nav className="mt-auto flex flex-col gap-0.5">
          <div className="px-2.5 pb-1 text-[10.5px] uppercase tracking-[0.1em] text-muted-rtx">Sistema</div>
          <NavItem to="/configuracoes">Configurações</NavItem>
          <NavItem to="/usuarios">Usuários</NavItem>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-border-rtx bg-white px-7 py-3">
          <span className="font-display text-sm font-semibold text-ink">RTX Imports</span>
          <div className="flex items-center gap-4">
            <CambioIndicador />
            <Relogio />
          </div>
        </header>
        <main className="px-7 py-6">
          <Routes>
            <Route path="/" element={<InicioPage />} />
            <Route path="/compra" element={<CompraPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
            <Route path="/produtos" element={<ProdutosPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhePage />} />
            <Route path="/rastreamento" element={<RastreamentoPage />} />
            <Route path="/precos" element={<PrecosFornecedorPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
