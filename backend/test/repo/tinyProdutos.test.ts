import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarProdutosTiny, TinyNaoConfiguradoError } from "../../src/repo/tinyProdutos.js";

const TOKEN_ORIGINAL = process.env.TINY_TOKEN_RTX;

beforeEach(() => {
  process.env.TINY_TOKEN_RTX = "token-de-teste";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env.TINY_TOKEN_RTX = TOKEN_ORIGINAL;
  vi.unstubAllGlobals();
});

describe("buscarProdutosTiny", () => {
  it("lança TinyNaoConfiguradoError quando TINY_TOKEN_RTX não está setado", async () => {
    delete process.env.TINY_TOKEN_RTX;
    await expect(buscarProdutosTiny("rolo")).rejects.toBeInstanceOf(TinyNaoConfiguradoError);
  });

  it("mapeia os produtos retornados pelo Tiny, incluindo o tipo sugerido pelo SKU", async () => {
    const respostaTiny = {
      retorno: {
        status: "OK",
        produtos: [
          // SKU canônico de 14 chars, linha "401" (posições 3-5) => rolinho.
          { produto: { id: "1", codigo: "10401BRAFOS100", nome: "Rolo 10m", unidade: "UN", situacao: "A" } },
          { produto: { id: "2", codigo: "SKU-FORA-DO-PADRAO", nome: "Outro produto", unidade: "UN", situacao: "A" } },
        ],
      },
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    const produtos = await buscarProdutosTiny("rolo");
    expect(produtos).toEqual([
      { sku: "10401BRAFOS100", nome: "Rolo 10m", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: "rolinho" },
      {
        sku: "SKU-FORA-DO-PADRAO",
        nome: "Outro produto",
        tinyId: "2",
        unidade: "UN",
        situacao: "A",
        tipoSugerido: null,
      },
    ]);
  });

  it("devolve lista vazia quando o Tiny diz que não há registros (código 20)", async () => {
    const respostaTiny = { retorno: { status: "Erro", erros: [{ erro: "20" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    const produtos = await buscarProdutosTiny("inexistente");
    expect(produtos).toEqual([]);
  });

  it("lança erro para outros códigos de erro do Tiny", async () => {
    const respostaTiny = { retorno: { status: "Erro", erros: [{ erro: "6" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    await expect(buscarProdutosTiny("rolo")).rejects.toThrow();
  });
});
