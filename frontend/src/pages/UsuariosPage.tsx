import { ConceitoBanner } from "./ConceitoBanner";

/**
 * Usuários — rascunho de direção visual. O schema já tem uma tabela
 * `usuarios` (id/nome/email/senha_hash/ativo), mas nenhuma autenticação de
 * verdade existe ainda (TODO.md: "Suporte a mais de um usuário", pedido de
 * Beatriz em 04/09/2026 — permissões por fase ficam pra avaliar depois,
 * não desenhar agora). Reservando o lugar no menu, sem funcionalidade real.
 */
export function UsuariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Usuários</h1>
        <p className="text-sm text-muted-rtx">Quem acessa o sistema e o que cada um pode editar.</p>
      </div>

      <ConceitoBanner>
        Autenticação real ainda não existe (ver TODO.md, "Suporte a mais de um usuário") — hoje o sistema não
        distingue quem está usando. Permissões por fase do processo ficam pra avaliar quando essa tarefa for
        priorizada.
      </ConceitoBanner>

      <section className="rounded-lg border border-dashed border-info bg-info-bg p-6 text-center">
        <p className="text-sm text-info">
          Lista de usuários e permissões aparece aqui quando a autenticação real existir.
        </p>
      </section>
    </div>
  );
}
