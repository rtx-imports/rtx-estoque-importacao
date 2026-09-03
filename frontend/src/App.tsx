import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clsx } from "clsx";
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
    <div className="font-planilha ml-auto text-xs text-slate-500">
      <span className="capitalize">{data}</span> <span className="font-medium text-slate-700">{hora}</span>
    </div>
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
          <Relogio />
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
