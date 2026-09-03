import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ParametrosComMetadados, Pedido, Produto, Proposta } from "./types";

export function useTodosProdutos(tipo?: string) {
  return useQuery({
    queryKey: ["produtos", "todos", { tipo }],
    queryFn: () => api.get<Produto[]>(`/produtos${tipo ? `?tipo=${tipo}` : ""}`),
  });
}

export interface ProdutoFormValues {
  sku: string;
  descricao?: string;
  unidades_por_caixa?: number;
  custo_unit_usd?: number;
  tipo?: string;
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProdutoFormValues) => api.post<Produto>("/produtos", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

export interface ProdutoEditValues {
  descricao?: string;
  unidades_por_caixa?: number;
  custo_unit_usd?: number;
  ativo?: boolean;
  tipo?: string | null;
}

export function useEditarProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, data }: { sku: string; data: ProdutoEditValues }) =>
      api.put<Produto>(`/produtos/${sku}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["proposta"] });
    },
  });
}

export function useSetEstoque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, quantidade }: { sku: string; quantidade: number }) =>
      api.put(`/estoque/${sku}`, { quantidade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposta"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

export function useParametros() {
  return useQuery({
    queryKey: ["parametros"],
    queryFn: () => api.get<ParametrosComMetadados>("/parametros"),
  });
}

export function useSetParametro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chave, valor }: { chave: string; valor: string }) =>
      api.put(`/parametros/${chave}`, { valor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      queryClient.invalidateQueries({ queryKey: ["proposta"] });
    },
  });
}

export function useProposta(fornecedorId?: string) {
  return useQuery({
    queryKey: ["proposta", fornecedorId],
    queryFn: () => api.get<Proposta>(`/proposta?fornecedor_id=${fornecedorId}`),
    enabled: Boolean(fornecedorId),
  });
}

export function useGerarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fornecedorId, overrides }: { fornecedorId: string; overrides: Record<string, number> }) =>
      api.post<Pedido>("/proposta/gerar-pedido", { fornecedor_id: fornecedorId, overrides }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}
