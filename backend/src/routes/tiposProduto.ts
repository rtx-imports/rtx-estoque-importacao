import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { tipoProdutoInputSchema } from "../schemas/tipoProduto.js";

export async function tiposProdutoRoutes(app: FastifyInstance) {
  app.get("/tipos-produto", async () => sql`SELECT * FROM tipos_produto ORDER BY nome`);

  app.post("/tipos-produto", async (request, reply) => {
    const parsed = tipoProdutoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const [tipo] = await sql`INSERT INTO tipos_produto (nome) VALUES (${parsed.data.nome}) RETURNING *`;
      return reply.code(201).send(tipo);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        return reply.code(409).send({ error: "Já existe um tipo de produto com esse nome" });
      }
      throw error;
    }
  });

  app.put("/tipos-produto/:nome", async (request, reply) => {
    const { nome } = request.params as { nome: string };
    const parsed = tipoProdutoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const novoNome = parsed.data.nome;
    if (novoNome === nome) {
      const [tipo] = await sql`SELECT * FROM tipos_produto WHERE nome = ${nome}`;
      if (!tipo) return reply.code(404).send({ error: "Tipo de produto não encontrado" });
      return tipo;
    }

    const [existente] = await sql`SELECT * FROM tipos_produto WHERE nome = ${nome}`;
    if (!existente) {
      return reply.code(404).send({ error: "Tipo de produto não encontrado" });
    }
    try {
      // Renomear a PK: cria o novo nome primeiro (senão o FK de produtos/fornecedor_tipos_produto
      // rejeitaria a atualização das linhas filhas antes do pai existir), migra as referências e só
      // então apaga a linha antiga.
      await sql.begin(async (tx) => {
        await tx`INSERT INTO tipos_produto (nome) VALUES (${novoNome})`;
        await tx`UPDATE produtos SET tipo = ${novoNome} WHERE tipo = ${nome}`;
        await tx`UPDATE fornecedor_tipos_produto SET tipo_produto = ${novoNome} WHERE tipo_produto = ${nome}`;
        await tx`DELETE FROM tipos_produto WHERE nome = ${nome}`;
      });
      const [tipo] = await sql`SELECT * FROM tipos_produto WHERE nome = ${novoNome}`;
      return tipo;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        return reply.code(409).send({ error: "Já existe um tipo de produto com esse nome" });
      }
      throw error;
    }
  });

  app.delete("/tipos-produto/:nome", async (request, reply) => {
    const { nome } = request.params as { nome: string };
    const [{ emUso }] = await sql`
      SELECT
        EXISTS(SELECT 1 FROM produtos WHERE tipo = ${nome})
        OR EXISTS(SELECT 1 FROM fornecedor_tipos_produto WHERE tipo_produto = ${nome})
        AS "emUso"
    `;
    if (emUso) {
      return reply.code(409).send({ error: "Tipo em uso por produto(s) ou fornecedor(es) — não é possível excluir" });
    }
    const [tipo] = await sql`DELETE FROM tipos_produto WHERE nome = ${nome} RETURNING *`;
    if (!tipo) {
      return reply.code(404).send({ error: "Tipo de produto não encontrado" });
    }
    return reply.code(204).send();
  });
}
