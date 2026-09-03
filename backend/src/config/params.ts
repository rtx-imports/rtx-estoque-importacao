/**
 * Parâmetros do cálculo de reposição. Defaults vêm do .env, sobrescritos em
 * runtime pela tabela `parametros` (chave/valor) — nada fica fixo no código.
 */

export interface ParamDefaults {
  leadTimeDias: number;
  /** Cobertura mínima desejada, em meses de demanda (M do motor de planoCompra.ts). */
  coberturaMinimaMeses: number;
  /** Crescimento mensal esperado da demanda (g do motor de planoCompra.ts; 1.10 = +10%/mês). */
  crescimentoMensal: number;
  cambio: number;
  janelaMeses: number;
}

export interface ParamRow {
  chave: string;
  valor: string;
}

function num(v: string | undefined, fallback: number): number {
  if (v == null || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function envDefaults(env: NodeJS.ProcessEnv = process.env): ParamDefaults {
  return {
    leadTimeDias: num(env.LEAD_TIME_DIAS, 90),
    // Defaults iguais ao rtx-pedidos (M=2, g=1.10) — motor recém-portado, já validado em produção lá.
    coberturaMinimaMeses: num(env.COBERTURA_MINIMA_MESES, 2),
    crescimentoMensal: num(env.CRESCIMENTO_MENSAL, 1.1),
    cambio: num(env.CAMBIO, 5.4),
    janelaMeses: num(env.JANELA_MESES, 9),
  };
}

export function mergeParams(defaults: ParamDefaults, rows: ParamRow[]): ParamDefaults {
  const out = { ...defaults };
  for (const { chave, valor } of rows) {
    switch (chave) {
      case "lead_time_dias":
        out.leadTimeDias = num(valor, out.leadTimeDias);
        break;
      case "cobertura_minima_meses":
        out.coberturaMinimaMeses = num(valor, out.coberturaMinimaMeses);
        break;
      case "crescimento_mensal":
        out.crescimentoMensal = num(valor, out.crescimentoMensal);
        break;
      case "cambio":
        out.cambio = num(valor, out.cambio);
        break;
      case "janela_meses":
        out.janelaMeses = num(valor, out.janelaMeses);
        break;
      default:
        break;
    }
  }
  return out;
}
