import type { FastifyInstance } from "fastify";
import { buscarProdutosTiny, TinyNaoConfiguradoError } from "../repo/tinyProdutos.js";

export async function tinyRoutes(app: FastifyInstance) {
  app.get("/tiny/produtos", async (request, reply) => {
    const { busca, pagina } = request.query as { busca?: string; pagina?: string };
    if (!busca || busca.trim().length < 2) {
      return reply.code(400).send({ error: "busca precisa ter ao menos 2 caracteres" });
    }
    const paginaNum = Math.max(1, Number(pagina) || 1);

    try {
      return await buscarProdutosTiny(busca.trim(), paginaNum);
    } catch (error) {
      if (error instanceof TinyNaoConfiguradoError) {
        return reply.code(503).send({ error: "Integração com o Tiny não configurada" });
      }
      request.log.error(error);
      return reply.code(502).send({ error: "Falha ao consultar o Tiny" });
    }
  });
}
