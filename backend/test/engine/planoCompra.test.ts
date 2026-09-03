import { describe, expect, it } from "vitest";
import { HORIZONTE, planejar, type ParametrosPlano } from "../../src/engine/planoCompra.js";

const p: ParametrosPlano = { g: 1.1, L: 3, M: 2 };

/**
 * Reconstrói o estoque físico no fim de cada mês a partir do plano —
 * verificação independente de que o plano nunca deixa o físico cair abaixo
 * da meta de M meses de cobertura (mesmo cálculo do rtx-pedidos).
 */
function fisicoFimDeMes(
  demandaMensal: number,
  estoque: number,
  emTransito: number,
  plan: number[],
  params: ParametrosPlano,
): number[] {
  const dem = (m: number) => demandaMensal * Math.pow(params.g, m);
  let onhand = estoque + emTransito;
  const incoming: Record<number, number> = {};
  const fisico: number[] = [];
  for (let t = 0; t < plan.length; t++) {
    onhand += incoming[t] ?? 0;
    delete incoming[t];
    if (plan[t] > 0) {
      const a = t + params.L;
      incoming[a] = (incoming[a] ?? 0) + plan[t];
    }
    onhand = Math.max(0, onhand - dem(t));
    fisico.push(onhand);
  }
  return fisico;
}

describe("planejar", () => {
  it("HORIZONTE tem 7 colunas (mês atual + 6 seguintes)", () => {
    expect(HORIZONTE).toBe(7);
  });

  // Casos de aceite exato validados em produção (rtx-pedidos, "aceite EXATO do Gustavo").
  const casos: [string, number, number, number, number[]][] = [
    ["02105BRABRI50C", 307, 0, 1988, [255, 531, 584, 643, 707, 778, 855]],
    ["03105BRABRI50C", 188, 396, 1692, [0, 0, 0, 362, 433, 476, 524]],
    ["05105BRABRI50C", 419, 3385, 4406, [0, 0, 0, 0, 0, 0, 863]],
  ];
  for (const [sku, d, estoque, transito, esperado] of casos) {
    it(`plano de compras bate com o caso de aceite (${sku})`, () => {
      const { plan } = planejar(d, estoque, transito, p);
      expect(plan).toEqual(esperado);
    });
  }

  it("estoque físico nunca cai abaixo de 2 meses de cobertura", () => {
    const d = 250;
    const { plan } = planejar(d, 5000, 0, p);
    const fisico = fisicoFimDeMes(d, 5000, 0, plan, p);
    fisico.forEach((f, m) => {
      expect(f).toBeGreaterThanOrEqual(Math.floor(2 * d * Math.pow(p.g, m)));
    });
  });

  it("trânsito entra no disponível igual ao estoque (mesmo plano)", () => {
    expect(planejar(306, 1754, 0, p).plan).toEqual(planejar(306, 0, 1754, p).plan);
  });

  it("demanda zero (sem giro) -> plano todo zero", () => {
    const r = planejar(0, 100, 0, p);
    expect(r.acabaTipo).toBe("semgiro");
    expect(r.acabaMeses).toBeNull();
    expect(r.plan).toEqual(new Array(HORIZONTE).fill(0));
  });

  it("estoque enorme -> não quebra em 12 meses (acima12) e plano todo zero", () => {
    const r = planejar(10, 1_000_000, 0, p);
    expect(r.acabaTipo).toBe("acima12");
    expect(r.acabaMeses).toBeNull();
    expect(r.plan.every((x) => x === 0)).toBe(true);
  });

  it("Acaba Em começa no mês atual (k=0)", () => {
    const r = planejar(306, 0, 1754, p);
    expect(r.acabaTipo).toBe("mes");
    expect(r.acabaMeses).toBe(3);
  });
});
