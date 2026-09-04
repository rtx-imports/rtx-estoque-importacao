import { ConceitoBanner } from "./ConceitoBanner";

/**
 * Estoque — rascunho de direção visual pra próxima etapa (TODO.md, "Estoque
 * consolidado por CNPJ"): galpões, movimentações, separação por
 * RTX/BG/BW/BRA. Sessão própria pra desenhar de verdade — aqui é só o
 * lugar reservado no menu pra não esquecer, com o mesmo visual do protótipo
 * aprovado (Artifact "Sistema Visual RTX").
 */
export function EstoquePage() {
  const galpoes = [
    { nome: "Galpão Matriz", tag: "RTX · Pouso Alegre", ocupacao: 78 },
    { nome: "Galpão 2", tag: "RTX · São Carlos", ocupacao: 41 },
    { nome: "Full / Marketplace", tag: "ML · Shopee · Amazon", ocupacao: 23 },
  ];
  const movimentacoes = [
    { titulo: "Desova — DO260623318", onde: "Galpão Matriz · conferência OK", qtd: "+1.600 un", tipo: "in" as const },
    { titulo: "Transferência → BW", onde: "Galpão Matriz · NF 000482", qtd: "−320 un", tipo: "out" as const },
    { titulo: "Ajuste de contagem", onde: "Galpão 2 · manual, Bruno", qtd: "+18 un", tipo: "in" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Estoque</h1>
        <p className="text-sm text-muted-rtx">
          Galpões, movimentações e separação por empresa (RTX/BG/BW/BRA) — cada uma com estoque próprio no Tiny.
        </p>
      </div>

      <ConceitoBanner>
        Rascunho de layout — funcionalidade ainda não desenhada (TODO.md: "Estoque consolidado por CNPJ", sessão
        própria). Os números abaixo são exemplo, não dado real.
      </ConceitoBanner>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {galpoes.map((g) => (
          <div key={g.nome} className="rounded-lg border border-border-rtx bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{g.nome}</span>
              <span className="rounded-md border border-border-rtx bg-paper px-2 py-0.5 text-[11px] text-muted-rtx">
                {g.tag}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-border-rtx bg-paper">
              <div className="h-full bg-gold" style={{ width: `${g.ocupacao}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-rtx">
              <span>Ocupação</span>
              <span className="num-tabular font-semibold text-ink">{g.ocupacao}%</span>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border-rtx bg-surface">
        <div className="border-b border-border-rtx px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Movimentações recentes</h2>
        </div>
        <div className="divide-y divide-border-rtx">
          {movimentacoes.map((m) => (
            <div key={m.titulo} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  m.tipo === "in" ? "bg-emerald-100 text-emerald-700" : "bg-info-bg text-info"
                }`}
              >
                {m.tipo === "in" ? "↑" : "↓"}
              </span>
              <div className="flex-1">
                <div className="font-medium text-ink">{m.titulo}</div>
                <div className="text-xs text-muted-rtx">{m.onde}</div>
              </div>
              <span className={`num-tabular font-semibold ${m.tipo === "in" ? "text-emerald-700" : "text-info"}`}>
                {m.qtd}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
