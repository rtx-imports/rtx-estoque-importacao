import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Pedido, PedidoChecklistItem, PedidoComDetalhes, PedidoItem, PedidoStatus } from "./types";

export function usePedidos(fornecedorId?: string) {
  return useQuery({
    queryKey: ["pedidos", { fornecedorId }],
    queryFn: () => api.get<Pedido[]>(`/pedidos${fornecedorId ? `?fornecedor_id=${fornecedorId}` : ""}`),
  });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ["pedidos", id],
    queryFn: () => api.get<PedidoComDetalhes>(`/pedidos/${id}`),
    enabled: Boolean(id),
  });
}

export interface PedidoFormValues {
  fornecedor_id: string;
  numero_referencia?: string;
  moeda?: string;
  observacoes?: string;
}

export function useCreatePedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PedidoFormValues) => api.post<PedidoComDetalhes>("/pedidos", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

export function useUpdatePedidoStatus(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PedidoStatus) => api.put<Pedido>(`/pedidos/${pedidoId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", { fornecedorId: undefined }] });
    },
  });
}

export interface ItemFormValues {
  item_code?: string;
  sku_interno?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  atributos_extra?: Record<string, unknown>;
}

export function useAddItem(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ItemFormValues) => api.post<PedidoItem>(`/pedidos/${pedidoId}/itens`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

export function useDeleteItem(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/pedidos/${pedidoId}/itens/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

/** Gera a matriz de checklist padrão da RTX (113 itens) num pedido que ainda
 * não tem nenhum item — pedidos criados antes da matriz existir não nasceram
 * com ela. */
export function useGerarMatrizChecklist(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<PedidoChecklistItem[]>(`/pedidos/${pedidoId}/checklist/gerar-matriz`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

export function useAddChecklistItem(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (descricao: string) =>
      api.post<PedidoChecklistItem>(`/pedidos/${pedidoId}/checklist`, { descricao }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

export function useToggleChecklistItem(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, concluido }: { itemId: string; concluido: boolean }) =>
      api.put<PedidoChecklistItem>(`/pedidos/${pedidoId}/checklist/${itemId}`, { concluido }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

export function useDeleteChecklistItem(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/pedidos/${pedidoId}/checklist/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}

export interface DocumentoFormValues {
  file: File;
  tipo_documento?: string;
  fase?: string;
  observacoes?: string;
}

export function useUploadDocumento(pedidoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DocumentoFormValues) => {
      const formData = new FormData();
      formData.append("file", data.file);
      if (data.tipo_documento) formData.append("tipo_documento", data.tipo_documento);
      if (data.fase) formData.append("fase", data.fase);
      if (data.observacoes) formData.append("observacoes", data.observacoes);
      return api.post(`/pedidos/${pedidoId}/documentos`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos", pedidoId] }),
  });
}
