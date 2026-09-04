/** Banner padrão pras páginas de projeto futuro (Estoque, Rastreamento,
 * Preços por Fornecedor) — deixa claro que é rascunho de direção visual,
 * sem funcionalidade real ainda, evitando que alguém confunda com dado
 * de verdade. Mesmo texto/estilo do protótipo (Artifact "Sistema Visual
 * RTX") replicado aqui pra não esquecer que essas páginas existem. */
export function ConceitoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-info bg-info-bg px-4 py-3 text-sm text-info">
      <span className="mt-0.5">ⓘ</span>
      <span>{children}</span>
    </div>
  );
}
