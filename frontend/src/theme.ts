/**
 * Modo claro/escuro/sistema — pedido de Beatriz em 04/09/2026 ("Configurações"
 * é onde isso mora, não os Parâmetros do Cálculo). "system" = sem atributo,
 * segue prefers-color-scheme (tokens em index.css); "light"/"dark" força a
 * escolha manual via `data-theme` na tag <html>, sobrepondo o SO nos dois
 * sentidos. Persistido em localStorage pra sobreviver a um F5.
 */
export type Tema = "light" | "dark" | "system";

const CHAVE_STORAGE = "rtx-tema";

export function lerTemaSalvo(): Tema {
  const valor = localStorage.getItem(CHAVE_STORAGE);
  return valor === "light" || valor === "dark" ? valor : "system";
}

export function aplicarTema(tema: Tema): void {
  if (tema === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(CHAVE_STORAGE);
  } else {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem(CHAVE_STORAGE, tema);
  }
}
