import { ConceitoBanner } from "./ConceitoBanner";

/**
 * Rastreamento de carga — rascunho de direção visual (TODO.md: pesquisa do
 * MarineTraffic já feita, contratação em aberto). ETA real por pedido
 * embarcado, quando a API for contratada.
 */
export function RastreamentoPage() {
  const pedidos = [
    { ref: "DO260623318", fornecedor: "Digiflex", navio: "MSC Beatriz", rota: "Qingdao → Santos", eta: "18/09/2026", status: "ok" as const, label: "No prazo" },
    { ref: "PI 26283", fornecedor: "Great Art", navio: "Ever Given II", rota: "Qingdao → Santos", eta: "27/09/2026", status: "warn" as const, label: "Atraso 3d" },
    { ref: "DO260701122", fornecedor: "Digiflex", navio: "COSCO Pacific", rota: "Ningbo → Santos", eta: "05/10/2026", status: "ok" as const, label: "No prazo" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Rastreamento de carga</h1>
        <p className="text-sm text-muted-rtx">ETA real por pedido embarcado — MarineTraffic ou equivalente.</p>
      </div>

      <ConceitoBanner>
        Pendente decidir se contrata a Container Tracking API antes de integrar de verdade (relatório de
        custo-benefício em "material de apoio", ~US$100/mês tier Essential). Dados abaixo são exemplo.
      </ConceitoBanner>

      <section className="rounded-lg border border-border-rtx bg-surface">
        <div className="border-b border-border-rtx px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Pedidos embarcados</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
              <th className="px-4 py-2">Pedido</th>
              <th className="px-4 py-2">Fornecedor</th>
              <th className="px-4 py-2">Navio</th>
              <th className="px-4 py-2">Rota</th>
              <th className="px-4 py-2">ETA</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.ref} className="border-b border-border-rtx last:border-0">
                <td className="px-4 py-2 font-medium text-ink">{p.ref}</td>
                <td className="px-4 py-2 text-muted-rtx">{p.fornecedor}</td>
                <td className="px-4 py-2 text-muted-rtx">{p.navio}</td>
                <td className="px-4 py-2 text-muted-rtx">{p.rota}</td>
                <td className="num-tabular px-4 py-2">{p.eta}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
