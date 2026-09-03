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
  };
}

const CODIGO_ERRO_SEM_REGISTROS = "20";

export async function buscarProdutosTiny(busca: string): Promise<TinyProduto[]> {
  const token = process.env.TINY_TOKEN_RTX;
  if (!token) {
    throw new TinyNaoConfiguradoError("TINY_TOKEN_RTX não configurado");
  }

  const qs = new URLSearchParams({ token, formato: "json", pesquisa: busca });
  const res = await fetch(`https://api.tiny.com.br/api2/produtos.pesquisa.php?${qs}`);
  if (!res.ok) {
    throw new Error(`Tiny respondeu status ${res.status}`);
  }
  const body = (await res.json()) as TinyResposta;

  if (body.retorno.status === "Erro") {
    const codigo = body.retorno.erros?.[0]?.erro;
    if (codigo === CODIGO_ERRO_SEM_REGISTROS) return [];
    throw new Error(`Tiny retornou erro: ${JSON.stringify(body.retorno.erros ?? body.retorno)}`);
  }

  const produtos = body.retorno.produtos ?? [];
  return produtos
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
}
