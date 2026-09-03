import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
  await sql`TRUNCATE produtos CASCADE`;
  await sql`TRUNCATE estoque CASCADE`;
  await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-ESTOQUE" } });
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("estoque", () => {
  it("define a quantidade em estoque de um produto (upsert)", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/estoque/SKU-ESTOQUE",
      payload: { quantidade: 150 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().quantidade).toBe(150);

    const segunda = await app.inject({ method: "PUT", url: "/estoque/SKU-ESTOQUE", payload: { quantidade: 80 } });
    expect(segunda.json().quantidade).toBe(80);

    const lista = await app.inject({ method: "GET", url: "/estoque" });
    expect(lista.json()).toHaveLength(1);
  });

  it("retorna 404 para produto inexistente", async () => {
    const response = await app.inject({ method: "PUT", url: "/estoque/NAO-EXISTE", payload: { quantidade: 10 } });
    expect(response.statusCode).toBe(404);
  });
});
