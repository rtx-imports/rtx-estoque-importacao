/**
 * Núcleo de "sincronizar um lote de estoque com o Tiny" — extraído de
 * `routes/produtos.ts` pra ser reaproveitado tanto pelo botão manual
 * ("2. Sincronizar estoque", em `POST /produtos/sincronizar-estoque`) quanto
 * pelo job automático em background (`jobs/estoqueAutosync.ts`), que roda
 * sozinho a cada alguns minutos pra manter o estoque sempre razoavelmente
 * atualizado sem precisar ninguém clicar em nada.
 */
import { sql } from "../db.js";
import { buscarEstoqueTiny, PAUSA_ENTRE_PAGINAS_MS, TinyBloqueadoError, TinyNaoConfiguradoError } from "../repo/tinyProdutos.js";

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProdutoParaSincronizar {
  sku: string;
  tiny_id: string;
}

export interface ResultadoSincronizacaoEstoque {
  processados: number;
  atualizados: number;
  falhas: number;
  /** true = parou cedo porque o Tiny bloqueou por rate limit — não é uma
   * falha comum, quem chamou deve esperar mais antes do próximo lote. */
  bloqueado: boolean;
}

/**
 * Sincroniza a lista de produtos dada, na ordem recebida, respeitando a
 * pausa entre chamadas e cortando na hora se o Tiny bloquear (não insiste
 * nos itens restantes). Não decide QUAIS produtos sincronizar nem quantos —
 * isso é responsabilidade de quem chama (a rota usa cursor por SKU; o job
 * automático usa "os mais desatualizados primeiro").
 */
export async function sincronizarLoteEstoque(produtos: ProdutoParaSincronizar[]): Promise<ResultadoSincronizacaoEstoque> {
  let atualizados = 0;
  let falhas = 0;
  let processados = 0;
  let bloqueado = false;

  for (const produto of produtos) {
    try {
      const quantidade = await buscarEstoqueTiny(produto.tiny_id);
      await sql`
        INSERT INTO estoque (sku, quantidade, atualizado_em)
        VALUES (${produto.sku}, ${quantidade}, now())
        ON CONFLICT (sku) DO UPDATE SET quantidade = ${quantidade}, atualizado_em = now()
      `;
      atualizados++;
    } catch (error) {
      if (error instanceof TinyNaoConfiguradoError) throw error;
      if (error instanceof TinyBloqueadoError) {
        bloqueado = true;
        break;
      }
      falhas++;
    }
    processados++;
    await aguardar(PAUSA_ENTRE_PAGINAS_MS);
  }

  return { processados, atualizados, falhas, bloqueado };
}
