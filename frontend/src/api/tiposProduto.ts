import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { TipoProdutoCadastrado } from "./types";

export function useTiposProduto() {
  return useQuery({
    queryKey: ["tipos-produto"],
    queryFn: () => api.get<TipoProdutoCadastrado[]>("/tipos-produto"),
  });
}

export function useCreateTipoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => api.post<TipoProdutoCadastrado>("/tipos-produto", { nome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tipos-produto"] }),
  });
}

export function useEditarTipoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nome, novoNome }: { nome: string; novoNome: string }) =>
      api.put<TipoProdutoCadastrado>(`/tipos-produto/${encodeURIComponent(nome)}`, { nome: novoNome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-produto"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

export function useExcluirTipoProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => api.delete(`/tipos-produto/${encodeURIComponent(nome)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tipos-produto"] }),
  });
}
