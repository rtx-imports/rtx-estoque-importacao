import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetCachePtaxParaTeste, lerPtaxReferencia } from "../../src/repo/bcbPtax.js";

const respostaBcb = [
  { data: "01/09/2026", valor: "5.3" },
  { data: "02/09/2026", valor: "5.4123" },
];

beforeEach(() => {
  _resetCachePtaxParaTeste();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lerPtaxReferencia", () => {
  it("lê o último valor da série do BCB e converte a data para YYYY-MM-DD", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(respostaBcb), { status: 200 }),
    );
    const ptax = await lerPtaxReferencia();
    expect(ptax).toEqual({ valor: 5.4123, data: "2026-09-02" });
  });

  it("devolve null em vez de quebrar quando o BCB está fora do ar", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    const ptax = await lerPtaxReferencia();
    expect(ptax).toBeNull();
  });

  it("devolve null quando o BCB responde com erro HTTP", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("erro", { status: 500 }));
    const ptax = await lerPtaxReferencia();
    expect(ptax).toBeNull();
  });

  it("usa cache em vez de buscar de novo em chamadas seguidas", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(respostaBcb), { status: 200 }),
    );
    await lerPtaxReferencia();
    await lerPtaxReferencia();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
