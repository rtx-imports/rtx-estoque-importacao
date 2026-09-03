import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Fornecedor, TipoProduto } from "./types";

export function useFornecedores(ativo?: boolean) {
  return useQuery({
    queryKey: ["fornecedores", { ativo }],
    queryFn: () => api.get<Fornecedor[]>(`/fornecedores${ativo === undefined ? "" : `?ativo=${ativo}`}`),
  });
}

export function useFornecedor(id: string | undefined) {
  return useQuery({
    queryKey: ["fornecedores", id],
    queryFn: () => api.get<Fornecedor>(`/fornecedores/${id}`),
    enabled: Boolean(id),
  });
}

export interface FornecedorFormValues {
  nome: string;
  pais?: string;
  contato_nome?: string;
  contato_email?: string;
  contato_telefone?: string;
  contato_wechat?: string;
  moeda_padrao?: string;
  exige_pagamento_inicial?: boolean;
  percentual_pagamento_inicial?: number | null;
  tipo_produto_padrao?: TipoProduto | null;
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FornecedorFormValues) => api.post<Fornecedor>("/fornecedores", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useEditarFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FornecedorFormValues }) =>
      api.put<Fornecedor>(`/fornecedores/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useDesativarFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Fornecedor>(`/fornecedores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useAtivarFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<Fornecedor>(`/fornecedores/${id}/ativar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useExcluirFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fornecedores/${id}/permanente`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}
