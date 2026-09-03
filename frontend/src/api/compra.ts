import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Parametros, Pedido, Produto, Proposta } from "./types";

export function useProdutos(fornecedorId?: string) {
  return useQuery({
    queryKey: ["produtos", { fornecedorId }],
    queryFn: () => api.get<Produto[]>(`/produtos${fornecedorId ? `?fornecedor_id=${fornecedorId}` : ""}`),
    enabled: Boolean(fornecedorId),
  });
}

export interface ProdutoFormValues {
  sku: string;
  descricao?: string;
  fornecedor_id: string;
  unidades_por_caixa?: number;
  custo_unit_usd?: number;
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProdutoFormValues) => api.post<Produto>("/produtos", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["produtos"] }),
  });
}

export function useSetEstoque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, quantidade }: { sku: string; quantidade: number }) =>
      api.put(`/estoque/${sku}`, { quantidade }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposta"] }),
  });
}

export function useSetEmTransito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, quantidade }: { sku: string; quantidade: number }) =>
      api.put(`/em-transito/${sku}`, { quantidade }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposta"] }),
  });
}

export function useParametros() {
  return useQuery({ queryKey: ["parametros"], queryFn: () => api.get<Parametros>("/parametros") });
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
