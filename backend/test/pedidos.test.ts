import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

async function criarFornecedor(overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: "POST",
    url: "/fornecedores",
    payload: { nome: "Fornecedor Rolos", moeda_padrao: "USD", ...overrides },
  });
  return response.json();
}

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("pedidos", () => {
  it("cria um pedido vinculado a um fornecedor, herdando a moeda padrão", async () => {
    const fornecedor = await criarFornecedor({ moeda_padrao: "EUR" });

    const response = await app.inject({
      method: "POST",
      url: "/pedidos",
      payload: { fornecedor_id: fornecedor.id, numero_referencia: "DO260623318" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.status).toBe("cotacao_proposta");
    expect(body.moeda).toBe("EUR");
    expect(body.itens).toEqual([]);
  });

  it("rejeita pedido com fornecedor_id inexistente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/pedidos",
      payload: { fornecedor_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("atualiza status do pedido", async () => {
    const fornecedor = await criarFornecedor();
    const created = await app.inject({
      method: "POST",
      url: "/pedidos",
      payload: { fornecedor_id: fornecedor.id },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "PUT",
      url: `/pedidos/${id}`,
      payload: { status: "prod_iniciada_sem_pgto" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("prod_iniciada_sem_pgto");
  });

  it("rejeita status fora do enum permitido", async () => {
    const fornecedor = await criarFornecedor();
    const created = await app.inject({
      method: "POST",
      url: "/pedidos",
      payload: { fornecedor_id: fornecedor.id },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "PUT",
      url: `/pedidos/${id}`,
      payload: { status: "status_invalido" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("adiciona item ao pedido e calcula valor_total automaticamente", async () => {
    const fornecedor = await criarFornecedor();
    const created = await app.inject({
      method: "POST",
      url: "/pedidos",
      payload: { fornecedor_id: fornecedor.id },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "POST",
      url: `/pedidos/${id}/itens`,
      payload: {
        item_code: "DG3111G",
        descricao: "Adesivo vinílico 1.22x50m",
        quantidade: 10,
        unidade: "m2",
        preco_unitario: 3.5,
        atributos_extra: { largura: 1.22, comprimento: 50, peso_liquido: 12 },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.valor_total).toBe(35);
    expect(body.atributos_extra.largura).toBe(1.22);
  });

  it("retorna 404 ao adicionar item a pedido inexistente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/pedidos/00000000-0000-0000-0000-000000000000/itens",
      payload: { descricao: "X", quantidade: 1, unidade: "peca", preco_unitario: 1 },
    });
    expect(response.statusCode).toBe(404);
  });

  it("recalcula valor_total ao atualizar quantidade de um item", async () => {
    const fornecedor = await criarFornecedor();
    const pedido = (
      await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedor.id } })
    ).json();
    const item = (
      await app.inject({
        method: "POST",
        url: `/pedidos/${pedido.id}/itens`,
        payload: { descricao: "Item", quantidade: 2, unidade: "peca", preco_unitario: 10 },
      })
    ).json();

    const response = await app.inject({
      method: "PUT",
      url: `/pedidos/${pedido.id}/itens/${item.id}`,
      payload: { quantidade: 5 },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.quantidade).toBe(5);
    expect(body.valor_total).toBe(50);
  });

  it("remove um item do pedido", async () => {
    const fornecedor = await criarFornecedor();
    const pedido = (
      await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedor.id } })
    ).json();
    const item = (
      await app.inject({
        method: "POST",
        url: `/pedidos/${pedido.id}/itens`,
        payload: { descricao: "Item a remover", quantidade: 1, unidade: "peca", preco_unitario: 1 },
      })
    ).json();

    const response = await app.inject({
      method: "DELETE",
      url: `/pedidos/${pedido.id}/itens/${item.id}`,
    });
    expect(response.statusCode).toBe(204);

    const pedidoAtualizado = await app.inject({ method: "GET", url: `/pedidos/${pedido.id}` });
    expect(pedidoAtualizado.json().itens).toEqual([]);
  });

  it("busca pedido por id com itens embutidos", async () => {
    const fornecedor = await criarFornecedor();
    const pedido = (
      await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedor.id } })
    ).json();
    await app.inject({
      method: "POST",
      url: `/pedidos/${pedido.id}/itens`,
      payload: { descricao: "Item 1", quantidade: 1, unidade: "peca", preco_unitario: 1 },
    });

    const response = await app.inject({ method: "GET", url: `/pedidos/${pedido.id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().itens).toHaveLength(1);
  });

  it("lista pedidos filtrando por fornecedor_id", async () => {
    const fornecedorA = await criarFornecedor({ nome: "A" });
    const fornecedorB = await criarFornecedor({ nome: "B" });
    await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedorA.id } });
    await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedorB.id } });

    const response = await app.inject({ method: "GET", url: `/pedidos?fornecedor_id=${fornecedorA.id}` });
    expect(response.json()).toHaveLength(1);
  });
});
