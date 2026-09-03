import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import { pedidoDocumentoFieldsSchema } from "../schemas/pedidoDocumento.js";
import { lerArquivo, salvarArquivo } from "../storage.js";

export async function pedidoDocumentosRoutes(app: FastifyInstance) {
  app.get("/pedidos/:id/documentos", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [pedido] = await sql`SELECT id FROM pedidos WHERE id = ${id}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }
    return sql`SELECT * FROM pedido_documentos WHERE pedido_id = ${id} ORDER BY enviado_em DESC`;
  });

  app.post("/pedidos/:id/documentos", async (request, reply) => {
    const { id: pedidoId } = request.params as { id: string };
    const [pedido] = await sql`SELECT id FROM pedidos WHERE id = ${pedidoId}`;
    if (!pedido) {
      return reply.code(404).send({ error: "Pedido não encontrado" });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "Nenhum arquivo enviado (campo 'file')" });
    }
    const buffer = await file.toBuffer();

    const rawFields: Record<string, string> = {};
    for (const [key, field] of Object.entries(file.fields)) {
      if (key === "file" || !field) continue;
      const single = Array.isArray(field) ? field[0] : field;
      if (single?.type === "field") {
        rawFields[key] = String(single.value);
      }
    }
    const parsed = pedidoDocumentoFieldsSchema.safeParse(rawFields);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { tipo_documento, fase, observacoes } = parsed.data;

    const [{ proximaVersao }] = await sql`
      SELECT COALESCE(MAX(versao), 0) + 1 AS "proximaVersao"
      FROM pedido_documentos
      WHERE pedido_id = ${pedidoId} AND tipo_documento = ${tipo_documento}
    `;

    const storagePath = await salvarArquivo(pedidoId, file.filename, buffer);
    const documentoId = randomUUID();
    const arquivoUrl = `/pedidos/${pedidoId}/documentos/${documentoId}/arquivo`;

    const [documento] = await sql`
      INSERT INTO pedido_documentos (
        id, pedido_id, fase, tipo_documento, arquivo_url, storage_path, versao, observacoes
      ) VALUES (
        ${documentoId}, ${pedidoId}, ${fase}, ${tipo_documento}, ${arquivoUrl}, ${storagePath},
        ${proximaVersao}, ${observacoes ?? null}
      )
      RETURNING *
    `;

    return reply.code(201).send(documento);
  });

  app.get("/pedidos/:id/documentos/:docId/arquivo", async (request, reply) => {
    const { id, docId } = request.params as { id: string; docId: string };
    const [documento] = await sql`
      SELECT * FROM pedido_documentos WHERE id = ${docId} AND pedido_id = ${id}
    `;
    if (!documento) {
      return reply.code(404).send({ error: "Documento não encontrado" });
    }
    const buffer = await lerArquivo(documento.storage_path);
    const filename = path.basename(documento.storage_path).replace(/^[0-9a-f-]{36}-/, "");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(buffer);
  });
}
