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

  it("aceita sufixo de width sem o 'C' final (confirmado batendo com a descrição real do produto)", () => {
    // "01105BLKOUT100" = "Adesivo Vinil Blackout 1m x 1m"; "02101PREFOS120" = "... 2m x 120cm"
    expect(dimensaoProduto("01105BLKOUT100", "rolinho")).toEqual({ lengthM: 1, widthM: 1 });
    expect(dimensaoProduto("02101PREFOS120", "rolinho")).toEqual({ lengthM: 2, widthM: 1.2 });
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

  it("recupera dimensão de placa em kit casando o sufixo com a peça avulsa correspondente na tabela", () => {
    // "70605PTJAZU77C" está na tabela (peça avulsa); "05605PTJAZU77C" é o mesmo
    // material vendido em kit de 5 — mesmo sufixo a partir da posição 2.
    expect(dimensaoProduto("05605PTJAZU77C", "placa")).toEqual({ widthM: 0.7, lengthM: 0.77 });
  });

  it("continua null para placa de kit sem par avulso na tabela (não inventa a partir da descrição)", () => {
    // decisão 24 do DECISIONS.md: extrair medida por regex na descrição foi
    // avaliado e descartado de propósito.
    expect(dimensaoProduto("05605PLBRAN083", "placa")).toBeNull();
  });
});
