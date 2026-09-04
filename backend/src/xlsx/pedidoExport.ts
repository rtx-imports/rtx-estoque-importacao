/**
 * Exportação "Exportar Pedido para Fornecedor" — o botão mais importante da
 * Decisão de Compra: gera a planilha que sai deste sistema em direção ao
 * fornecedor, no layout mais próximo do padrão real já em uso pela RTX.
 *
 * Layout localizado no material de apoio do projeto (não inventado):
 *   - `material de apoio.../Modelo pedidos/DO260623318_pedido inicial rolos.xlsx`
 *     (fornecedor de rolinhos, formato m²): Item Code, Description, Width,
 *     Length, Quantity, Square.m, Price/Sqm, N.Weight, G.Weight, Volume, Amount.
 *   - `material de apoio.../Modelo pedidos/PI 26283_Pedido inicial_placas.xlsx`
 *     (fornecedor de placas, formato peça): Item Code, Size, QTY, pcs/ctns,
 *     PACKS, FOB PRICE (USD/PCS), total amount (usd), Volume, TOTAL CBM, G.W.
 *   Essas duas planilhas são as PROFORMAS que os fornecedores devolvem (não o
 *   envio original da RTX), mas têm a mesma estrutura de colunas usada pelo
 *   `rtx-pedidos` (src/xlsx/planilha.ts, já em produção) pra gerar o pedido —
 *   é a referência mais próxima de um "padrão RTX" disponível hoje.
 *
 * Diferença deste sistema pro `rtx-pedidos`: o cadastro de produto aqui não
 * guarda N.Weight/G.Weight/Volume por unidade, packing (pcs/ctns) nem NCM —
 * essas colunas continuam no layout (fica igual ao que o fornecedor espera
 * receber de volta preenchido/conferir) mas saem em branco quando não há
 * dado — sinalizado, nunca inventado (mesmo princípio das decisões 24/26 do
 * DECISIONS.md). Width/Length e Price/Sqm SÃO calculáveis a partir do que já
 * temos (widthM/lengthM derivados do SKU, custo unitário) e saem preenchidos.
 */
import ExcelJS from "exceljs";
import type { PropostaItem } from "../domain/proposta.js";

const HEADER_M2 = [
  "Item Code",
  "Description",
  "Width",
  "Length",
  "Quantity",
  "Square.m",
  "Price/Sqm",
  "N.Weight",
  "G.Weight",
  "Volume",
  "Amount",
] as const;

const HEADER_PECA = [
  "Item Code",
  "Description",
  "Size",
  "QTY",
  "pcs/ctns",
  "PACKS",
  "FOB PRICE (USD/PCS)",
  "total amount (usd)",
  "Volume",
  "TOTAL CBM",
  "G.W.(KG)",
] as const;

/** Item com a quantidade ESCOLHIDA pelo usuário (pode divergir da sugestão automática). */
export interface ItemExportacao extends PropostaItem {
  necessidade: number; // já é a quantidade escolhida quando vem de calcularProposta com overrides
}

function formatarSize(widthM: number | null, lengthM: number | null): string {
  if (widthM == null || lengthM == null) return "";
  return `${(widthM * 100).toLocaleString("pt-BR")} x ${(lengthM * 100).toLocaleString("pt-BR")}cm`;
}

function planilhaM2(ws: ExcelJS.Worksheet, itens: ItemExportacao[]): void {
  ws.addRow(HEADER_M2 as unknown as string[]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c, i) => (c.width = [16, 42, 8, 8, 10, 10, 10, 9, 9, 10, 12][i] ?? 10));

  let totalQty = 0;
  let totalSqm = 0;
  let totalAmount = 0;
  for (const item of itens) {
    const width = item.widthM ?? 0;
    const length = item.lengthM ?? 0;
    const squareM = item.necessidade * width * length;
    const priceSqm = width > 0 && length > 0 ? item.custoUnitUsd / (width * length) : 0;
    const amount = squareM * priceSqm;
    totalQty += item.necessidade;
    totalSqm += squareM;
    totalAmount += amount;
    ws.addRow([
      item.sku,
      item.descricao,
      width || "",
      length || "",
      item.necessidade,
      squareM || "",
      priceSqm || "",
      "",
      "",
      "",
      amount || "",
    ]);
  }
  const tr = ws.addRow(["", "TOTAL", "", "", totalQty, totalSqm, "", "", "", "", totalAmount]);
  tr.font = { bold: true };
  ws.getColumn(6).numFmt = "#,##0.00";
  ws.getColumn(7).numFmt = "#,##0.0000";
  ws.getColumn(11).numFmt = "#,##0.00";
}

function planilhaPeca(ws: ExcelJS.Worksheet, itens: ItemExportacao[]): void {
  ws.addRow(HEADER_PECA as unknown as string[]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c, i) => (c.width = [16, 42, 16, 10, 10, 10, 14, 14, 9, 10, 10][i] ?? 10));

  let totalQty = 0;
  let totalAmount = 0;
  for (const item of itens) {
    const caixas = item.unidadesPorCaixa > 0 ? Math.ceil(item.necessidade / item.unidadesPorCaixa) : 0;
    const amount = item.necessidade * item.custoUnitUsd;
    totalQty += item.necessidade;
    totalAmount += amount;
    ws.addRow([
      item.sku,
      item.descricao,
      formatarSize(item.widthM, item.lengthM),
      item.necessidade,
      item.unidadesPorCaixa,
      caixas,
      item.custoUnitUsd || "",
      amount || "",
      "",
      "",
      "",
    ]);
  }
  const tr = ws.addRow(["", "TOTAL", "", totalQty, "", "", "", totalAmount, "", "", ""]);
  tr.font = { bold: true };
  ws.getColumn(7).numFmt = "#,##0.0000";
  ws.getColumn(8).numFmt = "#,##0.00";
}

/**
 * Uma aba por tipo de produto (rolinho/m² vs placa/peça, decidido pela
 * presença de largura×comprimento — não hardcoded no nome do tipo, ver
 * decisão 27 do DECISIONS.md sobre tipos de produto dinâmicos). Um tipo sem
 * dimensão cai no layout peça (mais genérico: qtd × preço unitário).
 */
export async function gerarPlanilhaPedido(fornecedorNome: string, itens: ItemExportacao[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RTX Imports — Decisão de Compra";
  wb.created = new Date();

  const porTipo = new Map<string, ItemExportacao[]>();
  for (const item of itens) {
    const chave = item.tipo ?? "outros";
    if (!porTipo.has(chave)) porTipo.set(chave, []);
    porTipo.get(chave)!.push(item);
  }

  for (const [tipo, itensDoTipo] of porTipo) {
    const nomeAba = tipo.slice(0, 28) || "Itens";
    const ws = wb.addWorksheet(nomeAba);
    const usaM2 = itensDoTipo.every((i) => i.widthM != null && i.lengthM != null);
    if (usaM2) planilhaM2(ws, itensDoTipo);
    else planilhaPeca(ws, itensDoTipo);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
