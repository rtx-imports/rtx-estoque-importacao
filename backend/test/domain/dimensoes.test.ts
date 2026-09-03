import { describe, expect, it } from "vitest";
import { dimensaoProduto } from "../../src/domain/dimensoes.js";

describe("dimensaoProduto", () => {
  it("deriva width/length de rolinho do próprio SKU (2 primeiros dígitos = length em m, sufixo antes do C = width em m)", () => {
    expect(dimensaoProduto("02105BRABRI50C", "rolinho")).toEqual({ lengthM: 2, widthM: 0.5 });
    expect(dimensaoProduto("01105BRABRI05C", "rolinho")).toEqual({ lengthM: 1, widthM: 0.05 });
  });

  it("retorna null para rolinho com SKU fora do padrão canônico", () => {
    expect(dimensaoProduto("SKU-CURTO", "rolinho")).toBeNull();
  });

  it("busca width/length de placa na tabela de-para (container.json não tem essa medida)", () => {
    expect(dimensaoProduto("30605PLMDNT60C", "placa")).toEqual({ widthM: 0.3, lengthM: 0.6 });
  });

  it("retorna null para placa fora da tabela de-para (não inventa medida)", () => {
    expect(dimensaoProduto("30605XXXXXX60C", "placa")).toBeNull();
  });

  it("retorna null sem tipo classificado", () => {
    expect(dimensaoProduto("02105BRABRI50C", null)).toBeNull();
  });
});
