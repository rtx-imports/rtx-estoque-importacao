import { describe, expect, it } from "vitest";
import { demandaPicoMensal } from "../../src/engine/demanda.js";

describe("demandaPicoMensal", () => {
  it("retorna o maior valor mensal da série", () => {
    const demanda = demandaPicoMensal([
      { mes: "2026-01", quantidade: 100 },
      { mes: "2026-02", quantidade: 250 },
      { mes: "2026-03", quantidade: 180 },
    ]);
    expect(demanda).toBe(250);
  });

  it("retorna 0 para série vazia", () => {
    expect(demandaPicoMensal([])).toBe(0);
  });
});
