/**
 * Conexão compartilhada com o painel-gbw (só leitura, DECISIONS.md decisão
 * 15) — um único pool de conexão reaproveitado por todos os repos que leem
 * de lá (`vendasPainel.ts`, `inventarioFull.ts`, ...), em vez de cada um
 * abrir o seu. Tolerante: sem `PAINEL_DATABASE_URL` configurada, devolve
 * undefined em vez de quebrar (útil pra dev sem credencial).
 */
import postgres from "postgres";

let painelSql: ReturnType<typeof postgres> | undefined;

export function getPainelSql() {
  const connectionString = process.env.PAINEL_DATABASE_URL;
  if (!connectionString) return undefined;
  if (!painelSql) {
    painelSql = postgres(connectionString, { onnotice: () => {} });
  }
  return painelSql;
}
