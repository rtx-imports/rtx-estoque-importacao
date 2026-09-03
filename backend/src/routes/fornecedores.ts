import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { fornecedorInputSchema, fornecedorUpdateSchema } from "../schemas/fornecedor.js";

export async function fornecedoresRoutes(app: FastifyInstance) {
  app.get("/fornecedores", async (request) => {
    const { ativo } = request.query as { ativo?: string };
    if (ativo === "true" || ativo === "false") {
      return sql`SELECT * FROM fornecedores WHERE ativo = ${ativo === "true"} ORDER BY nome`;
    }
    return sql`SELECT * FROM fornecedores ORDER BY nome`;
  });

  app.get("/fornecedores/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [fornecedor] = await sql`SELECT * FROM fornecedores WHERE id = ${id}`;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }
    return fornecedor;
  });

  app.post("/fornecedores", async (request, reply) => {
    const parsed = fornecedorInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const [fornecedor] = await sql`
      INSERT INTO fornecedores (
        nome, pais, contato_nome, contato_email, contato_telefone,
        contato_wechat, moeda_padrao, exige_pagamento_inicial,
        percentual_pagamento_inicial, layout_pedido
      ) VALUES (
        ${data.nome}, ${data.pais ?? null}, ${data.contato_nome ?? null},
        ${data.contato_email ?? null}, ${data.contato_telefone ?? null},
        ${data.contato_wechat ?? null}, ${data.moeda_padrao},
        ${data.exige_pagamento_inicial}, ${data.percentual_pagamento_inicial ?? null},
        ${sql.json(data.layout_pedido)}
      )
      RETURNING *
    `;
    return reply.code(201).send(fornecedor);
  });

  app.put("/fornecedores/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = fornecedorUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: "Nenhum campo para atualizar" });
    }

    const setClauses = Object.entries(data).map(([key, value]) => {
      const column = sql(key);
      return key === "layout_pedido" ? sql`${column} = ${sql.json(value as Record<string, unknown>)}` : sql`${column} = ${value}`;
    });

    const [fornecedor] = await sql`
      UPDATE fornecedores
      SET ${setClauses.reduce((acc, clause) => sql`${acc}, ${clause}`)}, atualizado_em = now()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }
    return fornecedor;
  });

  app.delete("/fornecedores/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [fornecedor] = await sql`
      UPDATE fornecedores SET ativo = false, atualizado_em = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }
    return fornecedor;
  });
}
