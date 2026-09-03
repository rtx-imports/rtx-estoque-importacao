import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { TinyProduto } from "./types";

export function useTinyProdutos(busca: string) {
  return useQuery({
    queryKey: ["tiny-produtos", busca],
    queryFn: () => api.get<TinyProduto[]>(`/tiny/produtos?busca=${encodeURIComponent(busca)}`),
    enabled: busca.trim().length >= 2,
    retry: false,
  });
}
