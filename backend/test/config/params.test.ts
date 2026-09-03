import { describe, expect, it } from "vitest";
import { envDefaults, mergeParams } from "../../src/config/params.js";

describe("envDefaults", () => {
  it("usa os defaults do modelo quando o env está vazio", () => {
    const params = envDefaults({});
    expect(params).toEqual({ leadTimeDias: 90, coberturaAlvoDias: 30, cambio: 5.4, janelaMeses: 9 });
  });

  it("lê valores do env quando presentes", () => {
    const params = envDefaults({ LEAD_TIME_DIAS: "75", CAMBIO: "5.1" });
    expect(params.leadTimeDias).toBe(75);
    expect(params.cambio).toBe(5.1);
  });
});

describe("mergeParams", () => {
  it("sobrescreve os defaults com as linhas da tabela parametros", () => {
    const params = mergeParams(envDefaults({}), [
      { chave: "lead_time_dias", valor: "60" },
      { chave: "cambio", valor: "5.5" },
    ]);
    expect(params.leadTimeDias).toBe(60);
    expect(params.cambio).toBe(5.5);
    expect(params.coberturaAlvoDias).toBe(30);
  });

  it("ignora chaves desconhecidas e valores inválidos", () => {
    const params = mergeParams(envDefaults({}), [
      { chave: "chave_inexistente", valor: "999" },
      { chave: "cambio", valor: "não-é-número" },
    ]);
    expect(params.cambio).toBe(5.4);
  });
});
