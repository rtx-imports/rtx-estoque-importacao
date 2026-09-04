import type { PropostaItem } from "../../api/types";

export function formatarData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function mesLabel(k: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + k);
  return `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatarBRL(valor: number): string {
  return brlFormatter.format(valor);
}

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function formatarUSD(valor: number): string {
  return usdFormatter.format(valor);
}

export function formatarMetros(valor: number | null): string {
  return valor == null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}m`;
}

export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

/** "Revisar" (vermelho) até 3 meses pra acabar, "Repor" (amber) até 5, senão "Ok". */
export type StatusLinha = "ok" | "repor" | "revisar" | "semgiro";
export function statusLinha(item: PropostaItem): StatusLinha {
  if (item.acabaTipo === "semgiro") return "semgiro";
  if (item.acabaTipo === "acima12") return "ok";
  const k = item.acabaMeses ?? 99;
  if (k <= 3) return "revisar";
  if (k <= 5) return "repor";
  return "ok";
}
export const STATUS_BORDA: Record<StatusLinha, string> = {
  ok: "border-l-emerald-600",
  repor: "border-l-amber-500",
  revisar: "border-l-red-600",
  semgiro: "border-l-slate-300",
};
export const STATUS_LABEL: Record<StatusLinha, string> = {
  ok: "Ok",
  repor: "Repor",
  revisar: "Revisar",
  semgiro: "Sem giro",
};

export function acabaLabel(item: PropostaItem): string {
  if (item.acabaTipo === "semgiro") return "Sem giro";
  if (item.acabaTipo === "acima12") return ">12 meses";
  return mesLabel(item.acabaMeses ?? 0);
}

export function acabaClasse(item: PropostaItem): string {
  if (item.acabaTipo !== "mes") return "text-slate-400";
  const k = item.acabaMeses ?? 99;
  if (k <= 3) return "font-bold text-red-600";
  if (k <= 5) return "font-semibold text-amber-600";
  return "text-slate-600";
}

export const ABC_COR: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-slate-100 text-slate-600",
};

export const XYZ_COR: Record<string, string> = {
  X: "bg-emerald-100 text-emerald-700",
  Y: "bg-amber-100 text-amber-700",
  Z: "bg-red-100 text-red-700",
};
