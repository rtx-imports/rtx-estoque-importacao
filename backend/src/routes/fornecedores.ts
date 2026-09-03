import type { FastifyInstance } from "fastify";
import type postgres from "postgres";
import { sql } from "../db.js";
import { fornecedorInputSchema, fornecedorUpdateSchema } from "../schemas/fornecedor.js";

/**
 * `layout_pedido` chega do zod como `Record<string, unknown>` — já validado
 * como JSON pelo corpo da requisição, mas o tipo `JSONValue` do postgres.js
 * exige essa conversão explícita porque `unknown` não prova estruturalmente
 * que é serializável.
 */
const asJson = (value: Record<string, unknown>) => value as postgres.JSONValue;

/** Junta cada fornecedor com a lista de tipos de produto que ele vende (N:N). */
const SELECT_COM_TIPOS = sql`
  SELECT
    f.*,
    COALESCE(
      (SELECT array_agg(ftp.tipo_produto ORDER BY ftp.tipo_produto)
       FROM fornecedor_tipos_produto ftp WHERE ftp.fornecedor_id = f.id),
      '{}'
    ) AS tipos_produto
  FROM fornecedores f
`;

export async function fornecedoresRoutes(app: FastifyInstance) {
  app.get("/fornecedores", async (request) => {
    const { ativo } = request.query as { ativo?: string };
    if (ativo === "true" || ativo === "false") {
      return sql`${SELECT_COM_TIPOS} WHERE f.ativo = ${ativo === "true"} ORDER BY f.nome`;
    }
    return sql`${SELECT_COM_TIPOS} ORDER BY f.nome`;
  });

  app.get("/fornecedores/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [fornecedor] = await sql`${SELECT_COM_TIPOS} WHERE f.id = ${id}`;
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
    try {
      const fornecedor = await sql.begin(async (tx) => {
        const [novo] = await tx`
          INSERT INTO fornecedores (
            nome, pais, contato_nome, contato_email, contato_telefone,
            contato_wechat, moeda_padrao, exige_pagamento_inicial,
            percentual_pagamento_inicial, layout_pedido
          ) VALUES (
            ${data.nome}, ${data.pais ?? null}, ${data.contato_nome ?? null},
            ${data.contato_email ?? null}, ${data.contato_telefone ?? null},
            ${data.contato_wechat ?? null}, ${data.moeda_padrao},
            ${data.exige_pagamento_inicial}, ${data.percentual_pagamento_inicial ?? null},
            ${sql.json(asJson(data.layout_pedido))}
          )
          RETURNING *
        `;
        for (const tipo of data.tipos_produto) {
          await tx`INSERT INTO fornecedor_tipos_produto (fornecedor_id, tipo_produto) VALUES (${novo.id}, ${tipo})`;
        }
        return novo;
      });
      const [comTipos] = await sql`${SELECT_COM_TIPOS} WHERE f.id = ${fornecedor.id}`;
      return reply.code(201).send(comTipos);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23503") {
        return reply.code(400).send({ error: "Um dos tipos_produto informados não está cadastrado" });
      }
      throw error;
    }
  });

  app.put("/fornecedores/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await sql`SELECT * FROM fornecedores WHERE id = ${id}`;
    if (!existing) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }
    const parsed = fornecedorUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const nome = data.nome ?? existing.nome;
    const pais = data.pais ?? existing.pais;
    const contatoNome = data.contato_nome ?? existing.contato_nome;
    const contatoEmail = data.contato_email ?? existing.contato_email;
    const contatoTelefone = data.contato_telefone ?? existing.contato_telefone;
    const contatoWechat = data.contato_wechat ?? existing.contato_wechat;
    const moedaPadrao = data.moeda_padrao ?? existing.moeda_padrao;
    const exigePagamentoInicial = data.exige_pagamento_inicial ?? existing.exige_pagamento_inicial;
    const percentualPagamentoInicial = data.percentual_pagamento_inicial ?? existing.percentual_pagamento_inicial;
    const layoutPedido = asJson((data.layout_pedido ?? existing.layout_pedido) as Record<string, unknown>);

    try {
      await sql.begin(async (tx) => {
        await tx`
          UPDATE fornecedores SET
            nome = ${nome},
            pais = ${pais},
            contato_nome = ${contatoNome},
            contato_email = ${contatoEmail},
            contato_telefone = ${contatoTelefone},
            contato_wechat = ${contatoWechat},
            moeda_padrao = ${moedaPadrao},
            exige_pagamento_inicial = ${exigePagamentoInicial},
            percentual_pagamento_inicial = ${percentualPagamentoInicial},
            layout_pedido = ${sql.json(layoutPedido)},
            atualizado_em = now()
          WHERE id = ${id}
        `;
        if (data.tipos_produto !== undefined) {
          await tx`DELETE FROM fornecedor_tipos_produto WHERE fornecedor_id = ${id}`;
          for (const tipo of data.tipos_produto) {
            await tx`INSERT INTO fornecedor_tipos_produto (fornecedor_id, tipo_produto) VALUES (${id}, ${tipo})`;
          }
        }
      });
      const [fornecedor] = await sql`${SELECT_COM_TIPOS} WHERE f.id = ${id}`;
      return fornecedor;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23503") {
        return reply.code(400).send({ error: "Um dos tipos_produto informados não está cadastrado" });
      }
      throw error;
    }
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

  app.put("/fornecedores/:id/ativar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [fornecedor] = await sql`
      UPDATE fornecedores SET ativo = true, atualizado_em = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!fornecedor) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }
    return fornecedor;
  });

  app.delete("/fornecedores/:id/permanente", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [existing] = await sql`SELECT id FROM fornecedores WHERE id = ${id}`;
    if (!existing) {
      return reply.code(404).send({ error: "Fornecedor não encontrado" });
    }

    const [{ total }] = await sql`SELECT count(*)::int AS total FROM pedidos WHERE fornecedor_id = ${id}`;
    if (total > 0) {
      return reply.code(409).send({
        error: `Não é possível excluir: existem ${total} pedido(s) vinculado(s) a este fornecedor. Desative-o em vez de excluir.`,
      });
    }

    await sql`DELETE FROM fornecedores WHERE id = ${id}`;
    return reply.code(204).send();
  });
}
