/**
 * Parâmetros do cálculo de reposição. Defaults vêm do .env, sobrescritos em
 * runtime pela tabela `parametros` (chave/valor) — nada fica fixo no código.
 */

export interface ParamDefaults {
  leadTimeDias: number;
  coberturaAlvoDias: number;
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
    coberturaAlvoDias: num(env.COBERTURA_ALVO_DIAS, 30),
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
      case "cobertura_alvo_dias":
        out.coberturaAlvoDias = num(valor, out.coberturaAlvoDias);
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
