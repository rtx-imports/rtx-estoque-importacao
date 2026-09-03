import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

async function criarFornecedor() {
  const response = await app.inject({ method: "POST", url: "/fornecedores", payload: { nome: "Fornecedor Proposta" } });
  return response.json();
}

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
  await sql`TRUNCATE produtos CASCADE`;
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("GET /proposta", () => {
  it("retorna 400 sem fornecedor_id", async () => {
    const response = await app.inject({ method: "GET", url: "/proposta" });
    expect(response.statusCode).toBe(400);
  });

  it("retorna 404 para fornecedor inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/proposta?fornecedor_id=00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });

  it("calcula a proposta com os produtos ativos do fornecedor (sem venda do painel configurada, necessidade parte de 0)", async () => {
    const fornecedor = await criarFornecedor();
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-PROP-1", fornecedor_id: fornecedor.id, custo_unit_usd: 2 },
    });

    const response = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.itens).toHaveLength(1);
    expect(body.itens[0].sku).toBe("SKU-PROP-1");
    expect(body.totais.necessidade).toBe(body.itens.reduce((s: number, i: { necessidade: number }) => s + i.necessidade, 0));
  });
});

describe("POST /proposta/gerar-pedido", () => {
  it("gera um pedido com os itens de necessidade > 0 usando override", async () => {
    const fornecedor = await criarFornecedor();
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-GERAR-1", descricao: "Produto Gerar", fornecedor_id: fornecedor.id, custo_unit_usd: 3 },
    });

    const response = await app.inject({
      method: "POST",
      url: "/proposta/gerar-pedido",
      payload: { fornecedor_id: fornecedor.id, overrides: { "SKU-GERAR-1": 25 } },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.fornecedor_id).toBe(fornecedor.id);
    expect(body.itens).toHaveLength(1);
    expect(body.itens[0].quantidade).toBe(25);
    expect(body.itens[0].valor_total).toBe(75);
    expect(body.itens[0].atributos_extra.origem).toBe("proposta_compra");
  });

  it("recusa gerar pedido quando nenhum item tem necessidade acima de zero", async () => {
    const fornecedor = await criarFornecedor();
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-ZERO", fornecedor_id: fornecedor.id },
    });

    const response = await app.inject({
      method: "POST",
      url: "/proposta/gerar-pedido",
      payload: { fornecedor_id: fornecedor.id },
    });
    expect(response.statusCode).toBe(400);
  });
});
