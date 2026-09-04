import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { calcularProposta } from "../src/domain/proposta.js";

vi.mock("../src/repo/vendasPainel.js", async () => {
  const actual = await vi.importActual<typeof import("../src/repo/vendasPainel.js")>(
    "../src/repo/vendasPainel.js",
  );
  return { ...actual, lerVendasMensais: vi.fn() };
});

const { lerVendasMensais } = await import("../src/repo/vendasPainel.js");

const app = buildApp();

async function criarFornecedor(tipos: string[] = ["rolinho"]) {
  const response = await app.inject({
    method: "POST",
    url: "/fornecedores",
    payload: { nome: "Fornecedor Proposta", tipos_produto: tipos },
  });
  return response.json();
}

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
  await sql`TRUNCATE produtos CASCADE`;
  vi.mocked(lerVendasMensais).mockReset();
  vi.mocked(lerVendasMensais).mockResolvedValue([]); // sem venda por padrão (comportamento real sem painel-gbw configurado)
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

  it("calcula os campos do plano corretamente mesmo sem venda do painel (unit, calcularProposta direto — a rota HTTP filtra sem-giro da exibição)", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-PROP-1", tipo: "rolinho", custo_unit_usd: 2 },
    });
    // produto de outro tipo não deve entrar na proposta deste fornecedor.
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-PROP-PLACA", tipo: "placa" } });

    const { itens } = await calcularProposta(fornecedor.id);
    expect(itens).toHaveLength(1);
    expect(itens[0].sku).toBe("SKU-PROP-1");
    expect(itens[0].plan).toHaveLength(7);
    expect(itens[0].acabaTipo).toBe("semgiro"); // sem venda do painel, demanda = 0
    expect(itens[0].diasEstoqueAtual).toBeNull(); // sem giro — não há como medir cobertura
  });

  it("GET /proposta não mostra produto sem giro e sem estoque crítico (nada precisa de atenção)", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-PROP-1", tipo: "rolinho", custo_unit_usd: 2 },
    });

    const response = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().itens).toHaveLength(0);
  });

  it("GET /proposta mostra o produto quando o motor manda pedir este mês (necessidade > 0)", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-PROP-NECESSIDADE", tipo: "rolinho", custo_unit_usd: 2 },
    });
    vi.mocked(lerVendasMensais).mockResolvedValue([{ mes: "2026-08", quantidade: 100 }]);

    const response = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    const body = response.json();
    expect(body.itens).toHaveLength(1);
    expect(body.itens[0].sku).toBe("SKU-PROP-NECESSIDADE");
    expect(body.itens[0].necessidadeAuto).toBeGreaterThan(0);
    expect(body.totais.necessidade).toBe(body.itens.reduce((s: number, i: { necessidade: number }) => s + i.necessidade, 0));
  });

  it("GET /proposta mostra o produto com giro mas estoque atual crítico, mesmo sem necessidade este mês", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-PROP-CRITICO", tipo: "rolinho", custo_unit_usd: 2 },
    });
    // demanda baixa e estável, sem estoque: dias de estoque atual = 0 < estoqueCriticoDias (60 default).
    vi.mocked(lerVendasMensais).mockResolvedValue([{ mes: "2026-08", quantidade: 1 }]);

    const response = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    const body = response.json();
    expect(body.itens).toHaveLength(1);
    expect(body.itens[0].diasEstoqueAtual).toBe(0);
  });

  it("fornecedor sem tipos_produto não vê nenhum produto", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/fornecedores",
      payload: { nome: "Fornecedor Sem Tipo" },
    });
    const fornecedor = response.json();
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-QUALQUER", tipo: "rolinho" } });

    const proposta = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    expect(proposta.json().itens).toHaveLength(0);
  });

  it("fornecedor com múltiplos tipos_produto vê produtos de todos eles", async () => {
    const fornecedor = await criarFornecedor(["rolinho", "placa"]);
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-MULTI-ROLINHO", tipo: "rolinho" } });
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-MULTI-PLACA", tipo: "placa" } });
    vi.mocked(lerVendasMensais).mockResolvedValue([{ mes: "2026-08", quantidade: 1 }]);

    const { itens } = await calcularProposta(fornecedor.id);
    expect(itens.map((i) => i.sku).sort()).toEqual(["SKU-MULTI-PLACA", "SKU-MULTI-ROLINHO"]);
  });

  it("deriva o trânsito da soma dos itens de pedidos embarcados/aguardando desembaraço/em desova/conferência", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-TRANSITO", tipo: "rolinho" } });
    // giro qualquer, só pra o item passar no filtro de exibição da rota (precisaAtencao).
    vi.mocked(lerVendasMensais).mockResolvedValue([{ mes: "2026-08", quantidade: 1 }]);

    const embarcado = (
      await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedor.id } })
    ).json();
    await app.inject({
      method: "POST",
      url: `/pedidos/${embarcado.id}/itens`,
      payload: { item_code: "SKU-TRANSITO", descricao: "x", quantidade: 50, unidade: "un", preco_unitario: 1 },
    });
    await app.inject({ method: "PUT", url: `/pedidos/${embarcado.id}`, payload: { status: "embarcado_em_transito" } });

    // pedido ainda em rascunho não deve contar como em trânsito.
    const rascunho = (
      await app.inject({ method: "POST", url: "/pedidos", payload: { fornecedor_id: fornecedor.id } })
    ).json();
    await app.inject({
      method: "POST",
      url: `/pedidos/${rascunho.id}/itens`,
      payload: { item_code: "SKU-TRANSITO", descricao: "x", quantidade: 999, unidade: "un", preco_unitario: 1 },
    });

    const response = await app.inject({ method: "GET", url: `/proposta?fornecedor_id=${fornecedor.id}` });
    expect(response.json().itens[0].transito).toBe(50);
  });
});

describe("POST /proposta/gerar-pedido", () => {
  it("gera um pedido com os itens de necessidade > 0 usando override", async () => {
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "SKU-GERAR-1", descricao: "Produto Gerar", tipo: "rolinho", custo_unit_usd: 3 },
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
    const fornecedor = await criarFornecedor(["rolinho"]);
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-ZERO", tipo: "rolinho" } });

    const response = await app.inject({
      method: "POST",
      url: "/proposta/gerar-pedido",
      payload: { fornecedor_id: fornecedor.id },
    });
    expect(response.statusCode).toBe(400);
  });
});
