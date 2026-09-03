import { describe, expect, it } from "vitest";
import { custoUnitario } from "../../src/domain/custos.js";

describe("custoUnitario", () => {
  it("retorna o custo direto do SKU quando existe em custos.json", () => {
    expect(custoUnitario("01105BRABRI05C", "rolinho", "atual")).toBeCloseTo(0.18404811, 6);
    expect(custoUnitario("01105BRABRI05C", "rolinho", "full")).toBeCloseTo(0.1919641577, 6);
    expect(custoUnitario("01105BRABRI05C", "rolinho", "transito")).toBeCloseTo(0.1475426997, 6);
  });

  it("deriva o custo de placa pela dimensão (últimos 3 chars) quando o SKU não tem custo direto", () => {
    // SKU fictício sem entrada direta em custos.json, mesma dimensão "60C" de placas conhecidas.
    expect(custoUnitario("99605FICTIC60C", "placa", "atual")).toBeCloseTo(1.6896219932, 6);
  });

  it("não deriva por dimensão para rolinho (regra é só de placa)", () => {
    expect(custoUnitario("99105FICTIC60C", "rolinho", "atual")).toBeUndefined();
  });

  it("retorna undefined quando não há custo direto nem derivável", () => {
    expect(custoUnitario("SKU-INEXISTENTE", "rolinho", "atual")).toBeUndefined();
    expect(custoUnitario("99605FICTIC999", "placa", "atual")).toBeUndefined();
  });
});
