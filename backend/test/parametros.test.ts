import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE parametros`;
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("parametros", () => {
  it("retorna os defaults quando nada foi sobrescrito", async () => {
    const response = await app.inject({ method: "GET", url: "/parametros" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ leadTimeDias: 90, coberturaAlvoDias: 30, cambio: 5.4, janelaMeses: 9 });
  });

  it("sobrescreve um parâmetro e reflete no GET seguinte", async () => {
    await app.inject({ method: "PUT", url: "/parametros/cambio", payload: { valor: "5.55" } });
    const response = await app.inject({ method: "GET", url: "/parametros" });
    expect(response.json().cambio).toBe(5.55);
  });
});
