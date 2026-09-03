import { rm } from "node:fs/promises";
import path from "node:path";
import FormData from "form-data";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const UPLOAD_DIR = path.resolve("uploads");
const app = buildApp();

async function criarFornecedor() {
  const response = await app.inject({
    method: "POST",
    url: "/fornecedores",
    payload: { nome: "Fornecedor Documentos" },
  });
  return response.json();
}

async function criarPedido() {
  const fornecedor = await criarFornecedor();
  const response = await app.inject({
    method: "POST",
    url: "/pedidos",
    payload: { fornecedor_id: fornecedor.id },
  });
  return response.json();
}

function uploadDocumento(
  pedidoId: string,
  options: { filename?: string; conteudo?: string; fields?: Record<string, string> } = {},
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    form.append(key, value);
  }
  form.append("file", Buffer.from(options.conteudo ?? "conteudo de teste"), options.filename ?? "invoice.pdf");

  return app.inject({
    method: "POST",
    url: `/pedidos/${pedidoId}/documentos`,
    payload: form,
    headers: form.getHeaders(),
  });
}

beforeAll(async () => {
  await rm(UPLOAD_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
});

afterEach(async () => {
  await rm(UPLOAD_DIR, { recursive: true, force: true });
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("pedido_documentos", () => {
  it("faz upload de um documento com valores padrão de fase/tipo", async () => {
    const pedido = await criarPedido();

    const response = await uploadDocumento(pedido.id, { filename: "proforma.pdf" });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.tipo_documento).toBe("invoice_proforma");
    expect(body.fase).toBe("pedido");
    expect(body.versao).toBe(1);
    expect(body.arquivo_url).toBe(`/pedidos/${pedido.id}/documentos/${body.id}/arquivo`);
  });

  it("rejeita tipo_documento fora do enum permitido", async () => {
    const pedido = await criarPedido();

    const response = await uploadDocumento(pedido.id, {
      fields: { tipo_documento: "boleto_pizza" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 404 ao anexar documento a pedido inexistente", async () => {
    const response = await uploadDocumento("00000000-0000-0000-0000-000000000000");
    expect(response.statusCode).toBe(404);
  });

  it("incrementa versao para um segundo upload do mesmo tipo_documento", async () => {
    const pedido = await criarPedido();
    await uploadDocumento(pedido.id, { filename: "proforma-v1.pdf" });

    const response = await uploadDocumento(pedido.id, { filename: "proforma-v2.pdf" });

    expect(response.json().versao).toBe(2);
  });

  it("lista documentos de um pedido", async () => {
    const pedido = await criarPedido();
    await uploadDocumento(pedido.id, { filename: "a.pdf" });
    await uploadDocumento(pedido.id, {
      filename: "b.pdf",
      fields: { tipo_documento: "packing_list" },
    });

    const response = await app.inject({ method: "GET", url: `/pedidos/${pedido.id}/documentos` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it("baixa o arquivo enviado com o conteúdo original", async () => {
    const pedido = await criarPedido();
    const uploaded = (await uploadDocumento(pedido.id, { conteudo: "conteúdo-especial-123" })).json();

    const response = await app.inject({
      method: "GET",
      url: `/pedidos/${pedido.id}/documentos/${uploaded.id}/arquivo`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("conteúdo-especial-123");
  });

  it("inclui documentos embutidos no GET /pedidos/:id", async () => {
    const pedido = await criarPedido();
    await uploadDocumento(pedido.id);

    const response = await app.inject({ method: "GET", url: `/pedidos/${pedido.id}` });
    expect(response.json().documentos).toHaveLength(1);
  });
});
