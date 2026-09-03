import { describe, expect, it } from "vitest";
import { calcReorder } from "../../src/engine/reorder.js";

const params = { leadTimeDias: 90, coberturaAlvoDias: 30, cambio: 5.4 };

describe("calcReorder", () => {
  it("calcula a necessidade descontando estoque e trânsito", () => {
    const result = calcReorder(
      { demandaPicoMensal: 300, estoque: 200, transito: 100, unidadesPorCaixa: 50, custoUnitUsd: 2 },
      params,
    );
    // demandaDiaria = 10; coberturaTotal = 120; alvo = ceil(1200) = 1200
    expect(result.demandaDiaria).toBe(10);
    expect(result.coberturaTotalDias).toBe(120);
    expect(result.necessidadeAuto).toBe(1200 - 200 - 100);
    expect(result.necessidade).toBe(900);
    expect(result.isOverride).toBe(false);
  });

  it("nunca fica negativa quando estoque + trânsito cobre a demanda", () => {
    const result = calcReorder(
      { demandaPicoMensal: 30, estoque: 1000, transito: 0, unidadesPorCaixa: 10, custoUnitUsd: 1 },
      params,
    );
    expect(result.necessidade).toBe(0);
    expect(result.caixas).toBe(0);
  });

  it("calcula caixas arredondando para cima", () => {
    const result = calcReorder(
      { demandaPicoMensal: 300, estoque: 0, transito: 0, unidadesPorCaixa: 40, custoUnitUsd: 3 },
      params,
    );
    expect(result.necessidade).toBe(1200);
    expect(result.caixas).toBe(30);
    expect(result.custoUsd).toBe(3600);
    expect(result.custoBrl).toBeCloseTo(3600 * 5.4);
  });

  it("override manual vira a necessidade efetiva e propaga pro custo", () => {
    const result = calcReorder(
      { demandaPicoMensal: 300, estoque: 200, transito: 100, unidadesPorCaixa: 50, custoUnitUsd: 2 },
      params,
      500,
    );
    expect(result.necessidadeAuto).toBe(900);
    expect(result.necessidade).toBe(500);
    expect(result.isOverride).toBe(true);
    expect(result.custoUsd).toBe(1000);
  });

  it("override negativo ou inválido é tratado como 0", () => {
    const result = calcReorder(
      { demandaPicoMensal: 300, estoque: 0, transito: 0, unidadesPorCaixa: 10, custoUnitUsd: 1 },
      params,
      -50,
    );
    expect(result.necessidade).toBe(0);
  });
});
