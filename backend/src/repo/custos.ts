/**
 * Leitor da tabela de custos por SKU (src/data/custos.json), 3 preços
 * DISTINTOS por estágio do estoque — full (Estoque Full), atual (Estoque
 * Atual), transito (Em trânsito). Portado do `rtx-pedidos`
 * (src/repo/custos.ts + src/scripts/gen-custos.ts, decisão do usuário de
 * recuperar os 3 tiers em vez do `custo_unit_usd` único usado até aqui).
 *
 * Arquivo gerado por planilhas de custo mantidas fora do sistema (uma por
 * estágio) via `npm run gen:custos` no `rtx-pedidos` — aqui é consumido como
 * tabela de REFERÊNCIA versionada, não editável na tela. Regenerar exige
 * rodar aquele script (ou portá-lo com as planilhas atualizadas) e substituir
 * este arquivo. Tier ausente para um SKU = sem aquele preço, quem usa decide
 * o fallback (ver domain/custos.ts).
 */
import { readFileSync } from "node:fs";

export type Tier = "full" | "atual" | "transito";
export type Custo = Partial<Record<Tier, number>>;

interface CustosFile {
  geradoEm: string | null;
  moeda: string;
  custos: Record<string, Custo>;
  placasDim?: Record<string, Custo>;
}

let cache: CustosFile | undefined;

function load(): CustosFile {
  if (!cache) {
    try {
      cache = JSON.parse(readFileSync(new URL("../data/custos.json", import.meta.url), "utf8")) as CustosFile;
    } catch {
      cache = { geradoEm: null, moeda: "BRL", custos: {} };
    }
  }
  return cache;
}

/** SKU canônico exato -> {full?, atual?, transito?}. Vazio se o arquivo não existe. */
export function lerCustos(): Map<string, Custo> {
  return new Map(Object.entries(load().custos));
}

/**
 * Custo/folha por DIMENSÃO da placa (últimos 3 chars do SKU: 60C, 77C, 38C…).
 * Placa sem custo direto no SKU herda o custo da sua dimensão — mesma
 * dimensão de folha custa o mesmo entre materiais/cores diferentes.
 */
export function lerPlacasDim(): Map<string, Custo> {
  return new Map(Object.entries(load().placasDim ?? {}));
}

export function moedaCustos(): string {
  return load().moeda || "BRL";
}
