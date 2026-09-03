/**
 * Planejamento de compra por SKU: "Acaba Em" + plano de compras de HORIZONTE
 * meses. Portado do motor já validado em produção no `rtx-pedidos`
 * (src/config/pedido-necessario.ts) — mesma matemática, mesmos testes de
 * aceite (ver planoCompra.test.ts). Função pura — sem I/O.
 *
 * ACABA EM (horizonte de busca configurável, default 12 meses; começa no mês
 * atual k=0, igual ao plano):
 *   disp = estoque + emTransito
 *   para k=0..horizonte: se disp < M·D·g^k -> Acaba Em = k ; senão disp -= D·g^k
 *
 * PLANO DE COMPRAS (HORIZONTE meses; índice 0 = mês atual) — meta: estoque
 * FÍSICO no fim de cada mês nunca abaixo de M meses da venda daquele mês
 * (não a "posição" estoque+trânsito):
 *   onhand = estoque + emTransito             (trânsito conta como disponível)
 *   incoming = {}  (mês de chegada -> qtd planejada)
 *   para t = 0..HORIZONTE-1:
 *     onhand += incoming[t]                    (recebe pedidos que chegam em t)
 *     a = t + L                                (pedido colocado em t chega em a)
 *     proj = onhand − D(t) ; para j=t+1..a: proj += incoming[j] − D(j)
 *     se proj < M·D(a): q = ceil(M·D(a) − proj) ; plan[t] = q ; incoming[a] += q
 *     onhand = max(0, onhand − D(t))
 *   plan[t] = unidades a PEDIR (colocar o pedido) naquele mês. D(m) = D·g^m.
 */

/** Nº de colunas do plano de compras: mês atual (0) + próximos 6. */
export const HORIZONTE = 7;

export interface ParametrosPlano {
  /** Crescimento mensal esperado da demanda (ex: 1.10 = +10%/mês). */
  g: number;
  /** Lead time em meses. */
  L: number;
  /** Cobertura mínima desejada, em meses de demanda. */
  M: number;
}

export type AcabaTipo = "mes" | "semgiro" | "acima12";

export interface ResultadoPlano {
  acabaMeses: number | null;
  acabaTipo: AcabaTipo;
  plan: number[];
}

export function planejar(
  demandaMensal: number,
  estoque: number,
  emTransito: number,
  params: ParametrosPlano,
  horizonteAcaba = 12,
): ResultadoPlano {
  const plan = new Array<number>(HORIZONTE).fill(0);

  if (demandaMensal > 0) {
    const dem = (m: number) => demandaMensal * Math.pow(params.g, m);
    let onhand = estoque + emTransito;
    const incoming: Record<number, number> = {};

    for (let t = 0; t < HORIZONTE; t++) {
      onhand += incoming[t] ?? 0;
      delete incoming[t];

      const a = t + params.L;
      let proj = onhand - dem(t);
      for (let j = t + 1; j <= a; j++) proj += (incoming[j] ?? 0) - dem(j);

      const floor = params.M * dem(a);
      if (proj < floor) {
        const q = Math.ceil(floor - proj);
        plan[t] = q;
        incoming[a] = (incoming[a] ?? 0) + q;
      }
      onhand = Math.max(0, onhand - dem(t));
    }
  }

  if (demandaMensal <= 0) {
    return { acabaMeses: null, acabaTipo: "semgiro", plan };
  }

  let disp = estoque + emTransito;
  let acabaMeses: number | null = null;
  for (let k = 0; k <= horizonteAcaba; k++) {
    if (disp < params.M * demandaMensal * Math.pow(params.g, k)) {
      acabaMeses = k;
      break;
    }
    disp -= demandaMensal * Math.pow(params.g, k);
  }
  if (acabaMeses === null) {
    return { acabaMeses: null, acabaTipo: "acima12", plan };
  }
  return { acabaMeses, acabaTipo: "mes", plan };
}
