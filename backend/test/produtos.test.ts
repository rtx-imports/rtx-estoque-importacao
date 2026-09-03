import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

async function criarFornecedor() {
  const response = await app.inject({
    method: "POST",
    url: "/fornecedores",
    payload: { nome: "Fornecedor Produtos" },
  });
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

describe("produtos", () => {
  it("cria um produto vinculado a um fornecedor", async () => {
    const fornecedor = await criarFornecedor();
    const response = await app.inject({
      method: "POST",
      url: "/produtos",
      payload: {
        sku: "01605PRATA-001",
        descricao: "Placa 3D 60x60",
        fornecedor_id: fornecedor.id,
        unidades_por_caixa: 20,
        custo_unit_usd: 1.2,
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.sku).toBe("01605PRATA-001");
    expect(body.ativo).toBe(true);
  });

  it("rejeita produto com fornecedor_id inexistente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU1", fornecedor_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("lista produtos filtrando por fornecedor", async () => {
    const fornecedorA = await criarFornecedor();
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-A", fornecedor_id: fornecedorA.id } });
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-B" } });

    const response = await app.inject({ method: "GET", url: `/produtos?fornecedor_id=${fornecedorA.id}` });
    expect(response.json()).toHaveLength(1);
  });

  it("edita um produto existente", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-EDIT", custo_unit_usd: 1 } });
    const response = await app.inject({
      method: "PUT",
      url: "/produtos/SKU-EDIT",
      payload: { custo_unit_usd: 2.5 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().custo_unit_usd).toBe(2.5);
  });
});
