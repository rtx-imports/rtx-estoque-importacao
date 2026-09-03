import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

vi.mock("../src/repo/bcbPtax.js", () => ({
  lerPtaxReferencia: vi.fn().mockResolvedValue({ valor: 5.6, data: "2026-09-03" }),
}));

const { lerPtaxReferencia } = await import("../src/repo/bcbPtax.js");

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE parametros`;
});

afterEach(() => {
  vi.mocked(lerPtaxReferencia).mockResolvedValue({ valor: 5.6, data: "2026-09-03" });
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("parametros", () => {
  it("retorna os defaults quando nada foi sobrescrito, com câmbio nunca atualizado manualmente", async () => {
    const response = await app.inject({ method: "GET", url: "/parametros" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      leadTimeDias: 90,
      coberturaMinimaMeses: 2,
      crescimentoMensal: 1.1,
      cambio: 5.4,
      janelaMeses: 9,
      estoqueCriticoDias: 60,
      cambioAtualizadoEm: null,
      ptaxReferencia: { valor: 5.6, data: "2026-09-03" },
    });
  });

  it("sobrescreve um parâmetro e reflete no GET seguinte, com data de atualização do câmbio", async () => {
    await app.inject({ method: "PUT", url: "/parametros/cambio", payload: { valor: "5.55" } });
    const response = await app.inject({ method: "GET", url: "/parametros" });
    expect(response.json().cambio).toBe(5.55);
    expect(response.json().cambioAtualizadoEm).not.toBeNull();
  });

  it("não quebra quando o BCB está fora do ar (ptaxReferencia vem null)", async () => {
    vi.mocked(lerPtaxReferencia).mockResolvedValue(null);
    const response = await app.inject({ method: "GET", url: "/parametros" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ptaxReferencia).toBeNull();
  });
});
