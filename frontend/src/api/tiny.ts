import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ResultadoBuscaTiny, ResultadoImportacaoCatalogoTiny } from "./types";

export function useTinyProdutos(busca: string, pagina = 1) {
  return useQuery({
    queryKey: ["tiny-produtos", busca, pagina],
    queryFn: () =>
      api.get<ResultadoBuscaTiny>(`/tiny/produtos?busca=${encodeURIComponent(busca)}&pagina=${pagina}`),
    enabled: busca.trim().length >= 2,
    retry: false,
  });
}

/** Sincroniza o catálogo inteiro do Tiny — percorre todas as páginas no
 * backend, então demora (dezenas de segundos); sem parâmetros. */
export function useImportarCatalogoTiny() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ResultadoImportacaoCatalogoTiny>("/produtos/importar-tiny-catalogo"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });
}
