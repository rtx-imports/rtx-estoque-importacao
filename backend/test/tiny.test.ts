import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { TinyNaoConfiguradoError } from "../src/repo/tinyProdutos.js";

vi.mock("../src/repo/tinyProdutos.js", async () => {
  const actual = await vi.importActual<typeof import("../src/repo/tinyProdutos.js")>(
    "../src/repo/tinyProdutos.js",
  );
  return { ...actual, buscarProdutosTiny: vi.fn() };
});

const { buscarProdutosTiny } = await import("../src/repo/tinyProdutos.js");

const app = buildApp();

afterAll(async () => {
  await app.close();
  await sql.end();
});

afterEach(() => {
  vi.mocked(buscarProdutosTiny).mockReset();
});

describe("GET /tiny/produtos", () => {
  it("exige ao menos 2 caracteres de busca", async () => {
    const response = await app.inject({ method: "GET", url: "/tiny/produtos?busca=a" });
    expect(response.statusCode).toBe(400);
  });

  it("devolve os produtos encontrados", async () => {
    vi.mocked(buscarProdutosTiny).mockResolvedValue({
      pagina: 1,
      totalPaginas: 1,
      produtos: [{ sku: "SKU-1", nome: "Produto 1", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: null }],
    });
    const response = await app.inject({ method: "GET", url: "/tiny/produtos?busca=rolo" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      pagina: 1,
      totalPaginas: 1,
      produtos: [{ sku: "SKU-1", nome: "Produto 1", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: null }],
    });
    expect(vi.mocked(buscarProdutosTiny).mock.calls[0]).toEqual(["rolo", 1]);
  });

  it("repassa o parâmetro de página", async () => {
    vi.mocked(buscarProdutosTiny).mockResolvedValue({ pagina: 2, totalPaginas: 3, produtos: [] });
    await app.inject({ method: "GET", url: "/tiny/produtos?busca=rolo&pagina=2" });
    expect(vi.mocked(buscarProdutosTiny).mock.calls[0]).toEqual(["rolo", 2]);
  });

  it("devolve 503 quando o Tiny não está configurado", async () => {
    vi.mocked(buscarProdutosTiny).mockRejectedValue(new TinyNaoConfiguradoError());
    const response = await app.inject({ method: "GET", url: "/tiny/produtos?busca=rolo" });
    expect(response.statusCode).toBe(503);
  });

  it("devolve 502 quando a busca no Tiny falha por outro motivo", async () => {
    vi.mocked(buscarProdutosTiny).mockRejectedValue(new Error("falha"));
    const response = await app.inject({ method: "GET", url: "/tiny/produtos?busca=rolo" });
    expect(response.statusCode).toBe(502);
  });
});
