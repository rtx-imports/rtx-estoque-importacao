import { NavLink, Route, Routes } from "react-router-dom";
import { clsx } from "clsx";
import { FornecedoresPage } from "./pages/FornecedoresPage";
import { PedidoDetalhePage } from "./pages/PedidoDetalhePage";
import { PedidosPage } from "./pages/PedidosPage";

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

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="mr-4 text-lg font-semibold text-slate-800">RTX Imports</span>
          <NavItem to="/fornecedores">Fornecedores</NavItem>
          <NavItem to="/pedidos">Pedidos</NavItem>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<PedidosPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/:id" element={<PedidoDetalhePage />} />
        </Routes>
      </main>
    </div>
  );
}
