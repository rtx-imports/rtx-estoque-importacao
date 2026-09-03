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

  it("reativa um fornecedor desativado", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor a Reativar" },
    });
    const { id } = created.json();
    await app.inject({ method: "DELETE", url: `/fornecedores/${id}` });

    const response = await app.inject({ method: "PUT", url: `/fornecedores/${id}/ativar` });
    expect(response.statusCode).toBe(200);
    expect(response.json().ativo).toBe(true);
  });

  it("exclui permanentemente um fornecedor sem pedidos vinculados", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor a Excluir" },
    });
    const { id } = created.json();

    const response = await app.inject({ method: "DELETE", url: `/fornecedores/${id}/permanente` });
    expect(response.statusCode).toBe(204);

    const busca = await app.inject({ method: "GET", url: `/fornecedores/${id}` });
    expect(busca.statusCode).toBe(404);
  });

  it("cadastra fornecedor com múltiplos tipos de produto e devolve a lista", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Multi-Tipo", tipos_produto: ["rolinho", "placa"] },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().tipos_produto).toEqual(["placa", "rolinho"]);

    const busca = await app.inject({ method: "GET", url: `/fornecedores/${response.json().id}` });
    expect(busca.json().tipos_produto).toEqual(["placa", "rolinho"]);
  });

  it("fornecedor sem tipos_produto informado cai com lista vazia", async () => {
    const response = await app.inject({ method: "POST", url: "/fornecedores", payload: { nome: "Sem Tipo" } });
    expect(response.json().tipos_produto).toEqual([]);
  });

  it("recusa tipo de produto que não existe no cadastro", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Tipo Inválido", tipos_produto: ["tipo-que-nao-existe"] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("substitui a lista de tipos_produto ao editar", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Edita Tipo", tipos_produto: ["rolinho"] },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "PUT",
      url: `/fornecedores/${id}`,
      payload: { tipos_produto: ["placa"] },
    });
    expect(response.json().tipos_produto).toEqual(["placa"]);
  });

  it("editar sem informar tipos_produto mantém a lista atual", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Mantem Tipo", tipos_produto: ["rolinho"] },
    });
    const { id } = created.json();

    const response = await app.inject({ method: "PUT", url: `/fornecedores/${id}`, payload: { pais: "Vietnã" } });
    expect(response.json().tipos_produto).toEqual(["rolinho"]);
  });

  it("recusa exclusão permanente de fornecedor com pedidos vinculados", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor com Pedido" },
    });
    const { id } = created.json();
    await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: id } });

    const response = await app.inject({ method: "DELETE", url: `/fornecedores/${id}/permanente` });
    expect(response.statusCode).toBe(409);

    const busca = await app.inject({ method: "GET", url: `/fornecedores/${id}` });
    expect(busca.statusCode).toBe(200);
  });
});
