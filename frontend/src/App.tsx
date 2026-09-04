import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clsx } from "clsx";
import { useParametros } from "./api/compra";
import { CompraPage } from "./pages/CompraPage";
import { FornecedoresPage } from "./pages/FornecedoresPage";
import { PedidoDetalhePage } from "./pages/PedidoDetalhePage";
import { PedidosPage } from "./pages/PedidosPage";
import { ProdutosPage } from "./pages/ProdutosPage";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "rounded-md px-3 py-2 text-sm font-medium",
          isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200",
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
    <div className="font-planilha text-xs text-slate-500">
      <span className="capitalize">{data}</span> <span className="font-medium text-slate-700">{hora}</span>
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
        "font-planilha flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
        desatualizado ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700",
      )}
    >
      <span>US$ 1 = R$ {parametros.cambio.toFixed(4)}</span>
      {parametros.ptaxReferencia && (
        <span className="font-normal text-slate-400">
          (PTAX {parametros.ptaxReferencia.valor.toFixed(4)})
        </span>
      )}
      {desatualizado && <span>⚠</span>}
    </NavLink>
  );
}

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="mr-4 text-lg font-semibold text-slate-800">RTX Imports</span>
          <NavItem to="/compra">Decisão de Compra</NavItem>
          <NavItem to="/fornecedores">Fornecedores</NavItem>
          <NavItem to="/produtos">Produtos</NavItem>
          <NavItem to="/pedidos">Pedidos</NavItem>
          <div className="ml-auto flex items-center gap-4">
            <CambioIndicador />
            <Relogio />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<PedidosPage />} />
          <Route path="/compra" element={<CompraPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/:id" element={<PedidoDetalhePage />} />
        </Routes>
      </main>
    </div>
  );
}
