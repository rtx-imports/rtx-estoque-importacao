import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buscarCatalogoCompletoTiny,
  buscarEstoqueTiny,
  buscarProdutosTiny,
  TinyNaoConfiguradoError,
} from "../../src/repo/tinyProdutos.js";

const TOKEN_ORIGINAL = process.env.TINY_TOKEN_RTX;

beforeEach(() => {
  process.env.TINY_TOKEN_RTX = "token-de-teste";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env.TINY_TOKEN_RTX = TOKEN_ORIGINAL;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("buscarProdutosTiny", () => {
  it("lança TinyNaoConfiguradoError quando TINY_TOKEN_RTX não está setado", async () => {
    delete process.env.TINY_TOKEN_RTX;
    await expect(buscarProdutosTiny("rolo")).rejects.toBeInstanceOf(TinyNaoConfiguradoError);
  });

  it("mapeia os produtos retornados pelo Tiny, incluindo o tipo sugerido e a paginação", async () => {
    const respostaTiny = {
      retorno: {
        status: "OK",
        numero_paginas: 3,
        produtos: [
          // SKU canônico de 14 chars, linha "401" (posições 3-5) => rolinho.
          { produto: { id: "1", codigo: "10401BRAFOS100", nome: "Rolo 10m", unidade: "UN", situacao: "A" } },
          { produto: { id: "2", codigo: "SKU-FORA-DO-PADRAO", nome: "Outro produto", unidade: "UN", situacao: "A" } },
        ],
      },
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    const resultado = await buscarProdutosTiny("rolo");
    expect(resultado).toEqual({
      pagina: 1,
      totalPaginas: 3,
      produtos: [
        { sku: "10401BRAFOS100", nome: "Rolo 10m", tinyId: "1", unidade: "UN", situacao: "A", tipoSugerido: "rolinho" },
        {
          sku: "SKU-FORA-DO-PADRAO",
          nome: "Outro produto",
          tinyId: "2",
          unidade: "UN",
          situacao: "A",
          tipoSugerido: null,
        },
      ],
    });
  });

  it("repassa o número da página pedida pro Tiny e pro resultado", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ retorno: { status: "OK", numero_paginas: 2, produtos: [] } }), { status: 200 }),
    );
    const resultado = await buscarProdutosTiny("rolo", 2);
    expect(resultado.pagina).toBe(2);
    const urlChamada = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(urlChamada).toContain("pagina=2");
  });

  it("devolve lista vazia quando o Tiny diz que não há registros (código 20)", async () => {
    const respostaTiny = { retorno: { status: "Erro", erros: [{ erro: "20" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    const resultado = await buscarProdutosTiny("inexistente");
    expect(resultado.produtos).toEqual([]);
  });

  it("lança erro para outros códigos de erro do Tiny", async () => {
    const respostaTiny = { retorno: { status: "Erro", erros: [{ erro: "99" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaTiny), { status: 200 }));
    await expect(buscarProdutosTiny("rolo")).rejects.toThrow();
  });

  it("tenta de novo uma vez após rate limit (código 6) e funciona na segunda tentativa", async () => {
    vi.useFakeTimers();
    const respostaErro = { retorno: { status: "Erro", erros: [{ erro: "6" }] } };
    const respostaOk = { retorno: { status: "OK", numero_paginas: 1, produtos: [] } };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(respostaErro), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(respostaOk), { status: 200 }));

    const promise = buscarProdutosTiny("rolo");
    await vi.advanceTimersByTimeAsync(5000);
    const resultado = await promise;

    expect(resultado.produtos).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("desiste depois da segunda tentativa de rate limit", async () => {
    vi.useFakeTimers();
    const respostaErro = { retorno: { status: "Erro", erros: [{ erro: "6" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaErro), { status: 200 }));

    const promise = buscarProdutosTiny("rolo").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const resultado = await promise;

    expect(resultado).toBeInstanceOf(Error);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("buscarCatalogoCompletoTiny", () => {
  it("percorre todas as páginas do Tiny e filtra só os classificáveis em rolinho/placa", async () => {
    vi.useFakeTimers();
    const pagina1 = {
      retorno: {
        status: "OK",
        numero_paginas: 2,
        produtos: [
          { produto: { id: "1", codigo: "10401BRAFOS100", nome: "Rolo", unidade: "UN", situacao: "A" } },
          { produto: { id: "2", codigo: "ETQ-100", nome: "Etiqueta", unidade: "UN", situacao: "A" } },
        ],
      },
    };
    const pagina2 = {
      retorno: {
        status: "OK",
        numero_paginas: 2,
        produtos: [{ produto: { id: "3", codigo: "30605PLMDBR60C", nome: "Placa", unidade: "UN", situacao: "A" } }],
      },
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(pagina1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pagina2), { status: 200 }));

    const promise = buscarCatalogoCompletoTiny();
    await vi.advanceTimersByTimeAsync(1000);
    const resultado = await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(resultado.totalNoTiny).toBe(3);
    expect(resultado.classificados.map((p) => p.sku)).toEqual(["10401BRAFOS100", "30605PLMDBR60C"]);
  });
});

describe("buscarEstoqueTiny", () => {
  it("lança TinyNaoConfiguradoError quando TINY_TOKEN_RTX não está setado", async () => {
    delete process.env.TINY_TOKEN_RTX;
    await expect(buscarEstoqueTiny("1")).rejects.toBeInstanceOf(TinyNaoConfiguradoError);
  });

  it("soma o saldo dos depósitos que contam, ignorando os marcados como desconsiderar='S'", async () => {
    const resposta = {
      retorno: {
        status: "OK",
        produto: {
          depositos: [
            { deposito: { nome: "Depósito Principal", saldo: "20.0000", desconsiderar: "N" } },
            { deposito: { nome: "Depósito 2", saldo: "5.0000", desconsiderar: "N" } },
            { deposito: { nome: "Depósito Bloqueado", saldo: "100.0000", desconsiderar: "S" } },
          ],
        },
      },
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(resposta), { status: 200 }));
    await expect(buscarEstoqueTiny("1")).resolves.toBe(25);
  });

  it("devolve 0 quando o produto não tem depósitos", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ retorno: { status: "OK", produto: {} } }), { status: 200 }),
    );
    await expect(buscarEstoqueTiny("1")).resolves.toBe(0);
  });

  it("tenta de novo uma vez após rate limit (código 6) e funciona na segunda tentativa", async () => {
    vi.useFakeTimers();
    const respostaErro = { retorno: { status: "Erro", erros: [{ erro: "6" }] } };
    const respostaOk = { retorno: { status: "OK", produto: { depositos: [] } } };
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(respostaErro), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(respostaOk), { status: 200 }));

    const promise = buscarEstoqueTiny("1");
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toBe(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("lança erro para outros códigos de erro do Tiny", async () => {
    const respostaErro = { retorno: { status: "Erro", erros: [{ erro: "99" }] } };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respostaErro), { status: 200 }));
    await expect(buscarEstoqueTiny("1")).rejects.toThrow();
  });
});
