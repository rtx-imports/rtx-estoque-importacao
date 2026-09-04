/**
 * Sincronização automática de estoque com o Tiny — mantém a base sempre
 * razoavelmente atualizada sem precisar ninguém clicar em "Sincronizar
 * estoque" manualmente. Pedido de Beatriz: "como podemos fazer para não
 * travar e estar sempre sincronizado?".
 *
 * Estratégia: um tick pequeno (LOTE, produtos MAIS DESATUALIZADOS primeiro —
 * nunca sincronizado entra antes de qualquer um já sincronizado) a cada
 * INTERVALO_MS. Nunca processa o catálogo inteiro de uma vez (isso é o que
 * causava os bloqueios de rate limit) — em vez disso, uma fatia pequena e
 * constante ao longo do dia todo, then dá tempo de sobra pro Tiny entre
 * ticks. Se um tick bater num bloqueio (`TinyBloqueadoError`), simplesmente
 * pula — o próximo tick tenta nos mesmos produtos (que continuam sendo os
 * mais desatualizados) depois do intervalo normal.
 *
 * Ligado automaticamente quando `TINY_TOKEN_RTX` está configurado; desligado
 * com `DISABLE_ESTOQUE_AUTOSYNC=1` (mesmo padrão de flag que o painel-gbw já
 * usa pros seus próprios schedulers, `DISABLE_AUTOSYNC`) — útil rodando
 * vários ambientes de dev ao mesmo tempo, pra não brigar pelo rate limit.
 */
import { sql } from "../db.js";
import { sincronizarLoteEstoque } from "../domain/estoqueSync.js";

const LOTE = 30;
const INTERVALO_MS = 5 * 60 * 1000; // 5 min — ~8640 produtos/dia de capacidade, folgado pro catálogo de ~3200

let timer: NodeJS.Timeout | undefined;
let emAndamento = false;

async function tick(): Promise<void> {
  if (emAndamento) return; // não sobrepõe se um tick anterior ainda não terminou
  emAndamento = true;
  try {
    const produtos = await sql<{ sku: string; tiny_id: string }[]>`
      SELECT produtos.sku, produtos.tiny_id
      FROM produtos
      LEFT JOIN estoque ON estoque.sku = produtos.sku
      WHERE produtos.tiny_id IS NOT NULL
      ORDER BY estoque.atualizado_em ASC NULLS FIRST
      LIMIT ${LOTE}
    `;
    if (!produtos.length) return;
    const resultado = await sincronizarLoteEstoque(produtos);
    if (resultado.processados > 0 || resultado.bloqueado) {
      console.log(
        `[estoque-autosync] ${resultado.atualizados} atualizado(s), ${resultado.falhas} falha(s)` +
          (resultado.bloqueado ? " — bloqueado pelo Tiny, retoma no próximo tick" : ""),
      );
    }
  } catch (error) {
    console.error("[estoque-autosync] erro no tick:", error);
  } finally {
    emAndamento = false;
  }
}

export function iniciarEstoqueAutosync(): void {
  if (!process.env.TINY_TOKEN_RTX || process.env.DISABLE_ESTOQUE_AUTOSYNC === "1") return;
  if (timer) return; // já iniciado
  timer = setInterval(tick, INTERVALO_MS);
  timer.unref?.(); // não impede o processo de encerrar (útil em testes/scripts)
}

export function pararEstoqueAutosync(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
