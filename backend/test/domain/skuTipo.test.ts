import { describe, expect, it } from "vitest";
import { classificarTipoPorSku } from "../../src/domain/skuTipo.js";

describe("classificarTipoPorSku", () => {
  it("classifica como rolinho quando a linha (posições 3-5) não é 605", () => {
    expect(classificarTipoPorSku("10401BRAFOS100")).toBe("rolinho");
  });

  it("classifica como placa quando a linha é 605", () => {
    expect(classificarTipoPorSku("30605PLMDBR60C")).toBe("placa");
  });

  it("devolve null para SKU fora do padrão canônico de 14 caracteres", () => {
    expect(classificarTipoPorSku("5-10JTEADO100")).toBeNull();
    expect(classificarTipoPorSku("Jateados-5")).toBeNull();
  });

  it("devolve null quando a linha não é numérica", () => {
    expect(classificarTipoPorSku("10ABCBRAFOS100")).toBeNull();
  });
});
