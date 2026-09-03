import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { TinyNaoConfiguradoError } from "../src/repo/tinyProdutos.js";

vi.mock("../src/repo/tinyProdutos.js", async () => {
  const actual = await vi.importActual<typeof import("../src/repo/tinyProdutos.js")>(
    "../src/repo/tinyProdutos.js",
  );
  return { ...actual, buscarCatalogoCompletoTiny: vi.fn(), buscarEstoqueTiny: vi.fn(), PAUSA_ENTRE_PAGINAS_MS: 0 };
});

const { buscarCatalogoCompletoTiny, buscarEstoqueTiny } = await import("../src/repo/tinyProdutos.js");

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
  await sql`TRUNCATE produtos CASCADE`;
  vi.mocked(buscarEstoqueTiny).mockResolvedValue(0);
});

afterEach(() => {
  vi.mocked(buscarCatalogoCompletoTiny).mockReset();
  vi.mocked(buscarEstoqueTiny).mockReset();
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("produtos", () => {
  it("cria um produto (sem fornecedor — produto é catálogo, não pertence a um fornecedor)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "01605PRATA-001", descricao: "Placa 3D 60x60", unidades_por_caixa: 20, custo_unit_usd: 1.2 },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.sku).toBe("01605PRATA-001");
    expect(body.ativo).toBe(true);
    expect(body.fornecedor_id).toBeUndefined();
  });

  it("lista produtos filtrando por tipo", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "10401BRAFOS100" } }); // rolinho
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "30605PLMDBR60C" } }); // placa

    const response = await app.inject({ method: "GET", url: "/produtos?tipo=rolinho" });
    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0].sku).toBe("10401BRAFOS100");
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

  it("classifica o tipo automaticamente pelo SKU ao cadastrar", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "10401BRAFOS100" }, // linha 401 => rolinho
    });
    expect(response.json().tipo).toBe("rolinho");
  });

  it("permite sobrescrever o tipo calculado automaticamente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "30605PLMDBR60C", tipo: "rolinho" }, // linha 605 seria placa, mas força rolinho
    });
    expect(response.json().tipo).toBe("rolinho");
  });

  it("mantém o tipo ao editar sem informar o campo", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "10401BRAFOS100" } });
    const response = await app.inject({
      method: "PUT",
      url: "/produtos/10401BRAFOS100",
      payload: { custo_unit_usd: 3 },
    });
    expect(response.json().tipo).toBe("rolinho");
  });

  it("permite limpar o tipo explicitamente", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "10401BRAFOS100" } });
    const response = await app.inject({
      method: "PUT",
      url: "/produtos/10401BRAFOS100",
      payload: { tipo: null },
    });
    expect(response.json().tipo).toBeNull();
  });
});

describe("POST /produtos/importar-tiny-catalogo", () => {
  it("importa só os classificáveis em rolinho/placa, ignorando o resto do catálogo do Tiny", async () => {
    vi.mocked(buscarCatalogoCompletoTiny).mockResolvedValue({
      totalNoTiny: 3,
      classificados: [
        { sku: "10401BRAFOS100", nome: "Rolo A", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: "rolinho" },
        { sku: "30605PLMDBR60C", nome: "Placa B", tinyId: "2", unidade: "UN", situacao: "A", tipoSugerido: "placa" },
      ],
    });

    vi.mocked(buscarEstoqueTiny).mockResolvedValue(42);

    const response = await app.inject({ method: "POST", url: "/produtos/importar-tiny-catalogo" });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      totalNoTiny: 3,
      classificados: 2,
      naoClassificados: 1,
      importados: 2,
      jaExistiam: 0,
      estoqueAtualizado: 2,
      custoPreenchido: 0,
    });

    const estoque = await app.inject({ method: "GET", url: "/estoque" });
    expect(estoque.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: "10401BRAFOS100", quantidade: 42 }),
        expect.objectContaining({ sku: "30605PLMDBR60C", quantidade: 42 }),
      ]),
    );

    const produtos = await app.inject({ method: "GET", url: "/produtos" });
    const body = produtos.json();
    expect(body).toHaveLength(2);
    expect(body.find((p: { sku: string }) => p.sku === "10401BRAFOS100").tipo).toBe("rolinho");
    expect(body.find((p: { sku: string }) => p.sku === "30605PLMDBR60C").tipo).toBe("placa");
  });

  it("pula SKUs que já existem em vez de duplicar", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "10401BRAFOS100" } });
    vi.mocked(buscarCatalogoCompletoTiny).mockResolvedValue({
      totalNoTiny: 1,
      classificados: [
        { sku: "10401BRAFOS100", nome: "Rolo A", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: "rolinho" },
      ],
    });

    const response = await app.inject({ method: "POST", url: "/produtos/importar-tiny-catalogo" });
    expect(response.json()).toEqual({
      totalNoTiny: 1,
      classificados: 1,
      naoClassificados: 0,
      importados: 0,
      jaExistiam: 1,
      estoqueAtualizado: 1,
      custoPreenchido: 0,
    });
  });

  it("já cadastra o produto novo com o custo da tabela custos.json (SKU com custo 'atual' conhecido)", async () => {
    vi.mocked(buscarCatalogoCompletoTiny).mockResolvedValue({
      totalNoTiny: 1,
      classificados: [
        {
          sku: "01105BRABRI05C", // tem custo "atual" conhecido em custos.json
          nome: "Rolo com custo",
          tinyId: "9",
          unidade: "UN",
          situacao: "A",
          tipoSugerido: "rolinho",
        },
      ],
    });

    await app.inject({ method: "POST", url: "/produtos/importar-tiny-catalogo" });

    const produto = await app.inject({ method: "GET", url: "/produtos/01105BRABRI05C" });
    expect(produto.json().custo_unit_usd).toBeCloseTo(0.18404811, 6);
  });

  it("faz backfill do custo de produto já cadastrado antes com custo 0 (sync anterior a essa tabela existir)", async () => {
    await app.inject({
      method: "POST",
      url: "/produtos",
      payload: { sku: "01105BRABRI05C", tipo: "rolinho", custo_unit_usd: 0 },
    });
    vi.mocked(buscarCatalogoCompletoTiny).mockResolvedValue({ totalNoTiny: 0, classificados: [] });

    const response = await app.inject({ method: "POST", url: "/produtos/importar-tiny-catalogo" });
    expect(response.json().custoPreenchido).toBe(1);

    const produto = await app.inject({ method: "GET", url: "/produtos/01105BRABRI05C" });
    expect(produto.json().custo_unit_usd).toBeCloseTo(0.18404811, 6);
  });

  it("devolve 503 quando o Tiny não está configurado", async () => {
    vi.mocked(buscarCatalogoCompletoTiny).mockRejectedValue(new TinyNaoConfiguradoError());
    const response = await app.inject({ method: "POST", url: "/produtos/importar-tiny-catalogo" });
    expect(response.statusCode).toBe(503);
  });
});
