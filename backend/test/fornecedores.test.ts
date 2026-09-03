import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("fornecedores", () => {
  it("cria um fornecedor e retorna 201", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Rolos", pais: "China", moeda_padrao: "USD" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.nome).toBe("Fornecedor Rolos");
    expect(body.ativo).toBe(true);
  });

  it("rejeita fornecedor sem nome", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { pais: "China" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejeita exige_pagamento_inicial=true sem percentual", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor X", exige_pagamento_inicial: true },
    });

    expect(response.statusCode).toBe(400);
  });

  it("aceita layout_pedido específico por fornecedor", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: {
        nome: "Fornecedor Placas",
        layout_pedido: { unidade: "peca", colunas: ["tamanho", "embalagem", "pcs_por_caixa"] },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().layout_pedido.unidade).toBe("peca");
  });

  it("lista fornecedores cadastrados", async () => {
    await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor A" },
    });
    await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor B" },
    });

    const response = await app.inject({ method: "GET", url: "/fornecedores" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it("busca fornecedor por id", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Busca" },
    });
    const { id } = created.json();

    const response = await app.inject({ method: "GET", url: `/fornecedores/${id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().nome).toBe("Fornecedor Busca");
  });

  it("retorna 404 ao buscar fornecedor inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/fornecedores/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });

  it("atualiza campos parciais de um fornecedor", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Original", pais: "China" },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "PUT",
      url: `/fornecedores/${id}`,
      payload: { pais: "Vietnã" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pais).toBe("Vietnã");
    expect(body.nome).toBe("Fornecedor Original");
  });

  it("desativa um fornecedor (soft delete)", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor a Desativar" },
    });
    const { id } = created.json();

    const response = await app.inject({ method: "DELETE", url: `/fornecedores/${id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().ativo).toBe(false);

    const listActive = await app.inject({ method: "GET", url: "/fornecedores?ativo=true" });
    expect(listActive.json()).toHaveLength(0);
  });
});
