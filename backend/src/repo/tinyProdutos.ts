/**
 * Busca de produtos no Tiny ERP — só leitura (DECISIONS.md, decisão 5), usada
 * pelo cadastro de produto pra puxar SKU/descrição em vez de digitar na mão
 * (decisão 17: minimizar digitação manual). Cliente próprio, mesmo padrão do
 * `rtx-pedidos` (api2, token por query string) sem trazer a parte de
 * sincronização de lá.
 */

import { classificarTipoPorSku, type TipoProduto } from "../domain/skuTipo.js";

export interface TinyProduto {
  sku: string;
  nome: string;
  tinyId: string;
  unidade: string;
  situacao: string;
  tipoSugerido: TipoProduto | null;
}

export class TinyNaoConfiguradoError extends Error {}

interface TinyRespostaProduto {
  produto?: { codigo?: string; nome?: string; id?: string; unidade?: string; situacao?: string };
  codigo?: string;
  nome?: string;
  id?: string;
  unidade?: string;
  situacao?: string;
}

interface TinyResposta {
  retorno: {
    status: string;
    erros?: { erro: string }[];
    produtos?: TinyRespostaProduto[];
    numero_paginas?: number;
  };
}

export interface ResultadoBuscaTiny {
  produtos: TinyProduto[];
  pagina: number;
  totalPaginas: number;
}

const CODIGO_ERRO_SEM_REGISTROS = "20";
const CODIGOS_ERRO_RATE_LIMIT = new Set(["6", "7"]);
const PAUSA_RATE_LIMIT_MS = 5000;
export const PAUSA_ENTRE_PAGINAS_MS = 300;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca paginada — uma busca ampla (ex: nome de uma linha de produto, ou
 * vazia pra listar o catálogo inteiro) pode trazer mais de uma página no
 * Tiny. Tenta de novo uma vez, com pausa, se o Tiny disser que estourou o
 * limite de requisições (códigos 6/7) — evita que uma sincronização de
 * catálogo inteiro (dezenas de páginas) falhe por uma rajada momentânea.
 */
export async function buscarProdutosTiny(
  busca: string,
  pagina = 1,
  tentativa = 0,
): Promise<ResultadoBuscaTiny> {
  const token = process.env.TINY_TOKEN_RTX;
  if (!token) {
    throw new TinyNaoConfiguradoError("TINY_TOKEN_RTX não configurado");
  }

  const qs = new URLSearchParams({ token, formato: "json", pesquisa: busca, pagina: String(pagina) });
  const res = await fetch(`https://api.tiny.com.br/api2/produtos.pesquisa.php?${qs}`);
  if (!res.ok) {
    throw new Error(`Tiny respondeu status ${res.status}`);
  }
  const body = (await res.json()) as TinyResposta;

  if (body.retorno.status === "Erro") {
    const codigo = body.retorno.erros?.[0]?.erro;
    if (codigo === CODIGO_ERRO_SEM_REGISTROS) return { produtos: [], pagina, totalPaginas: 0 };
    if (codigo && CODIGOS_ERRO_RATE_LIMIT.has(codigo) && tentativa < 1) {
      await aguardar(PAUSA_RATE_LIMIT_MS);
      return buscarProdutosTiny(busca, pagina, tentativa + 1);
    }
    throw new Error(`Tiny retornou erro: ${JSON.stringify(body.retorno.erros ?? body.retorno)}`);
  }

  const produtos = (body.retorno.produtos ?? [])
    .map((w) => {
      const p = w.produto ?? w;
      const sku = String(p.codigo ?? "");
      return {
        sku,
        nome: String(p.nome ?? ""),
        tinyId: String(p.id ?? ""),
        unidade: String(p.unidade ?? ""),
        situacao: String(p.situacao ?? ""),
        tipoSugerido: classificarTipoPorSku(sku),
      };
    })
    .filter((p) => p.sku !== "");

  return { produtos, pagina, totalPaginas: body.retorno.numero_paginas ?? 1 };
}

export interface ResultadoCatalogoTiny {
  totalNoTiny: number;
  classificados: TinyProduto[];
}

interface TinyDeposito {
  nome?: string;
  desconsiderar?: string;
  saldo?: number | string;
}

interface TinyRespostaEstoque {
  retorno: {
    status: string;
    erros?: { erro: string }[];
    produto?: { depositos?: { deposito: TinyDeposito }[] };
  };
}

function parseQtd(v: string | number | undefined | null): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Depósito marcado como desconsiderar='S' não entra na soma do estoque. */
function depositoConta(d: TinyDeposito): boolean {
  return String(d.desconsiderar ?? "N").toUpperCase() !== "S";
}

/**
 * Saldo de estoque de um produto no Tiny (soma de todos os depósitos que
 * contam), pelo `id` do produto no Tiny — mesma API/regra do `rtx-pedidos`
 * (`sync-estoque-rtx.ts`: `produto.obter.estoque.php`, desconsiderar='S' fora
 * da soma).
 */
export async function buscarEstoqueTiny(tinyId: string, tentativa = 0): Promise<number> {
  const token = process.env.TINY_TOKEN_RTX;
  if (!token) {
    throw new TinyNaoConfiguradoError("TINY_TOKEN_RTX não configurado");
  }

  const qs = new URLSearchParams({ token, formato: "json", id: tinyId });
  const res = await fetch(`https://api.tiny.com.br/api2/produto.obter.estoque.php?${qs}`);
  if (!res.ok) {
    throw new Error(`Tiny respondeu status ${res.status}`);
  }
  const body = (await res.json()) as TinyRespostaEstoque;

  if (body.retorno.status === "Erro") {
    const codigo = body.retorno.erros?.[0]?.erro;
    if (codigo && CODIGOS_ERRO_RATE_LIMIT.has(codigo) && tentativa < 1) {
      await aguardar(PAUSA_RATE_LIMIT_MS);
      return buscarEstoqueTiny(tinyId, tentativa + 1);
    }
    throw new Error(`Tiny retornou erro: ${JSON.stringify(body.retorno.erros ?? body.retorno)}`);
  }

  const depositos = body.retorno.produto?.depositos ?? [];
  return depositos.reduce(
    (total, { deposito }) => (depositoConta(deposito) ? total + parseQtd(deposito.saldo) : total),
    0,
  );
}

/**
 * Percorre o catálogo INTEIRO do Tiny (sem termo de busca) e devolve só os
 * produtos classificáveis em rolinho/placa (decisão 20) — o resto do
 * catálogo do Tiny (etiquetas, outras linhas) não é deste sistema. Usado
 * pra sincronizar o cadastro de produtos de uma vez (decisão 22), em vez de
 * cadastrar/buscar SKU por SKU.
 */
export async function buscarCatalogoCompletoTiny(): Promise<ResultadoCatalogoTiny> {
  const todos: TinyProduto[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const resultado = await buscarProdutosTiny("", pagina);
    todos.push(...resultado.produtos);
    totalPaginas = resultado.totalPaginas;
    pagina++;
    if (pagina <= totalPaginas) await aguardar(PAUSA_ENTRE_PAGINAS_MS);
  } while (pagina <= totalPaginas);

  return { totalNoTiny: todos.length, classificados: todos.filter((p) => p.tipoSugerido !== null) };
}
