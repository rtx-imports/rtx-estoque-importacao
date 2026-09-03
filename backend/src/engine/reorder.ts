/**
 * Modelo de cálculo da necessidade de compra — portado do motor já validado
 * em rtx-pedidos (src/engine/reorder.ts), mesma fórmula:
 *
 *   demanda_diaria   = demanda_pico_mensal / 30
 *   cobertura_total  = lead_time_dias + cobertura_alvo_dias        (dias)
 *   necessidade      = max(0, ceil(demanda_diaria * cobertura_total) - estoque - transito)
 *
 * Função pura — sem acesso a banco, sem I/O. O front pode recalcular um
 * override chamando exatamente esta função.
 */

export const DIAS_POR_MES = 30;

export interface ReorderInput {
  demandaPicoMensal: number;
  estoque: number;
  transito: number;
  unidadesPorCaixa: number;
  custoUnitUsd: number;
}

export interface ReorderParams {
  leadTimeDias: number;
  coberturaAlvoDias: number;
  cambio: number;
}

export interface ReorderResult {
  demandaDiaria: number;
  coberturaTotalDias: number;
  necessidadeAuto: number;
  necessidade: number;
  caixas: number;
  custoUsd: number;
  custoBrl: number;
  isOverride: boolean;
}

export function calcReorder(
  input: ReorderInput,
  params: ReorderParams,
  override?: number | null,
): ReorderResult {
  const demandaDiaria = input.demandaPicoMensal / DIAS_POR_MES;
  const coberturaTotalDias = params.leadTimeDias + params.coberturaAlvoDias;

  const alvo = Math.ceil(demandaDiaria * coberturaTotalDias);
  const necessidadeAuto = Math.max(0, alvo - input.estoque - input.transito);

  const hasOverride = override !== undefined && override !== null && !Number.isNaN(override);
  const necessidade = hasOverride ? Math.max(0, Math.round(override as number)) : necessidadeAuto;

  const caixas = necessidade > 0 ? Math.ceil(necessidade / input.unidadesPorCaixa) : 0;
  const custoUsd = necessidade * input.custoUnitUsd;
  const custoBrl = custoUsd * params.cambio;

  return {
    demandaDiaria,
    coberturaTotalDias,
    necessidadeAuto,
    necessidade,
    caixas,
    custoUsd,
    custoBrl,
    isOverride: hasOverride,
  };
}
