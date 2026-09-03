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
    vi.mocked(buscarProdutosTiny).mockResolvedValue([
      { sku: "SKU-1", nome: "Produto 1", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: null },
    ]);
    const response = await app.inject({ method: "GET", url: "/tiny/produtos?busca=rolo" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { sku: "SKU-1", nome: "Produto 1", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: null },
    ]);
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
