import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { sql } from "../src/db.js";

const app = buildApp();

beforeEach(async () => {
  await sql`TRUNCATE fornecedores CASCADE`;
  await sql`TRUNCATE produtos CASCADE`;
  await sql`DELETE FROM tipos_produto WHERE nome NOT IN ('rolinho', 'placa')`;
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("tipos de produto", () => {
  it("lista os tipos já cadastrados (seed rolinho/placa)", async () => {
    const response = await app.inject({ method: "GET", url: "/tipos-produto" });
    expect(response.statusCode).toBe(200);
    expect(response.json().map((t: { nome: string }) => t.nome)).toEqual(["placa", "rolinho"]);
  });

  it("cadastra um tipo de produto novo", async () => {
    const response = await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "adesivo" } });
    expect(response.statusCode).toBe(201);
    expect(response.json().nome).toBe("adesivo");

    const lista = await app.inject({ method: "GET", url: "/tipos-produto" });
    expect(lista.json().map((t: { nome: string }) => t.nome)).toContain("adesivo");
  });

  it("recusa cadastrar tipo duplicado", async () => {
    const response = await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "rolinho" } });
    expect(response.statusCode).toBe(409);
  });

  it("renomeia um tipo sem uso", async () => {
    await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "placas" } });
    const response = await app.inject({ method: "PUT", url: "/tipos-produto/placas", payload: { nome: "adesivo" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().nome).toBe("adesivo");

    const lista = await app.inject({ method: "GET", url: "/tipos-produto" });
    const nomes = lista.json().map((t: { nome: string }) => t.nome);
    expect(nomes).toContain("adesivo");
    expect(nomes).not.toContain("placas");
  });

  it("renomeia um tipo em uso e migra as referências de produto e fornecedor", async () => {
    await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "placas" } });
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-RENAME", tipo: "placas" } });
    await app.inject({ method: "POST", url: "/fornecedores", payload: { nome: "F", tipos_produto: ["placas"] } });

    const response = await app.inject({ method: "PUT", url: "/tipos-produto/placas", payload: { nome: "placa-b" } });
    expect(response.statusCode).toBe(200);

    const produto = await app.inject({ method: "GET", url: "/produtos/SKU-RENAME" });
    expect(produto.json().tipo).toBe("placa-b");

    const fornecedores = await app.inject({ method: "GET", url: "/fornecedores" });
    expect(fornecedores.json()[0].tipos_produto).toEqual(["placa-b"]);
  });

  it("retorna 404 ao renomear tipo inexistente", async () => {
    const response = await app.inject({ method: "PUT", url: "/tipos-produto/nao-existe", payload: { nome: "x" } });
    expect(response.statusCode).toBe(404);
  });

  it("recusa renomear para um nome que já existe", async () => {
    await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "placas" } });
    const response = await app.inject({ method: "PUT", url: "/tipos-produto/placas", payload: { nome: "rolinho" } });
    expect(response.statusCode).toBe(409);
  });

  it("exclui um tipo sem uso", async () => {
    await app.inject({ method: "POST", url: "/tipos-produto", payload: { nome: "descartavel" } });
    const response = await app.inject({ method: "DELETE", url: "/tipos-produto/descartavel" });
    expect(response.statusCode).toBe(204);
  });

  it("recusa excluir tipo em uso por produto", async () => {
    await app.inject({ method: "POST", url: "/produtos", payload: { sku: "SKU-TIPO-USO", tipo: "rolinho" } });
    const response = await app.inject({ method: "DELETE", url: "/tipos-produto/rolinho" });
    expect(response.statusCode).toBe(409);
  });

  it("recusa excluir tipo em uso por fornecedor", async () => {
    await app.inject({ method: "POST", url: "/fornecedores", payload: { nome: "F", tipos_produto: ["placa"] } });
    const response = await app.inject({ method: "DELETE", url: "/tipos-produto/placa" });
    expect(response.statusCode).toBe(409);
  });

  it("retorna 404 ao excluir tipo inexistente", async () => {
    const response = await app.inject({ method: "DELETE", url: "/tipos-produto/nao-existe" });
    expect(response.statusCode).toBe(404);
  });
});
