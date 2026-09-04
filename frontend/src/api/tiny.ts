import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ResultadoBuscaTiny, ResultadoImportacaoCatalogoTiny, ResultadoLoteEstoque } from "./types";

export function useTinyProdutos(busca: string, pagina = 1) {
  return useQuery({
    queryKey: ["tiny-produtos", busca, pagina],
    queryFn: () =>
      api.get<ResultadoBuscaTiny>(`/tiny/produtos?busca=${encodeURIComponent(busca)}&pagina=${pagina}`),
    enabled: busca.trim().length >= 2,
    retry: false,
  });
}

/** Sincroniza o catálogo (produtos novos, tiny_id, custo) — percorre todas as
 * páginas de busca do Tiny no backend, mas NÃO puxa estoque (isso é
 * `useSincronizarEstoqueLote`, separado pra não travar numa única requisição
 * longa demais). Demora dezenas de segundos, não minutos. */
export function useImportarCatalogoTiny() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<ResultadoImportacaoCatalogoTiny>("/produtos/importar-tiny-catalogo"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

/** Um lote de sincronização de estoque — chame de novo com `cursor` até
 * `proximoCursor` vir null (loop fica a cargo de quem usa o hook). */
export function useSincronizarEstoqueLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cursor: string | null) =>
      api.post<ResultadoLoteEstoque>("/produtos/sincronizar-estoque", { cursor: cursor ?? undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });
}
