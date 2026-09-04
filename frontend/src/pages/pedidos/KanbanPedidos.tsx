import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Pedido, PedidoStatus } from "../../api/types";
import { PEDIDO_STATUS, PEDIDO_STATUS_LABEL } from "../../api/types";

/** Cor por status — pipeline real do ClickUp (PDF "ETAPAS IMPORTAÇÃO_CLICK
 * UP"): Cotação/Proposta até Finalizado Financeiro, "Cancelado" à parte. */
const COR_STATUS: Record<PedidoStatus, { coluna: string; borda: string }> = {
  cotacao_proposta: { coluna: "bg-rose-100 text-rose-700", borda: "border-l-rose-500" },
  prod_iniciada_sem_pgto: { coluna: "bg-orange-100 text-orange-700", borda: "border-l-orange-500" },
  prod_iniciada_pgto_ok: { coluna: "bg-slate-200 text-slate-700", borda: "border-l-slate-500" },
  prod_finalizada_pre_embarque: { coluna: "bg-amber-100 text-amber-700", borda: "border-l-amber-500" },
  relatorio_embarques: { coluna: "bg-lime-100 text-lime-700", borda: "border-l-lime-500" },
  embarcado_em_transito: { coluna: "bg-yellow-100 text-yellow-700", borda: "border-l-yellow-500" },
  em_santos: { coluna: "bg-red-100 text-red-700", borda: "border-l-red-500" },
  desembaraco_coleta: { coluna: "bg-blue-100 text-blue-700", borda: "border-l-blue-500" },
  desova_agendada: { coluna: "bg-pink-100 text-pink-700", borda: "border-l-pink-500" },
  armazenado: { coluna: "bg-indigo-100 text-indigo-700", borda: "border-l-indigo-500" },
  finalizado_financeiro: { coluna: "bg-emerald-100 text-emerald-700", borda: "border-l-emerald-500" },
  cancelado: { coluna: "bg-slate-100 text-slate-500", borda: "border-l-slate-400" },
};

interface KanbanPedidosProps {
  pedidos: Pedido[];
  fornecedorPorId: Map<string, string>;
}

/** Mesma mutação da página de detalhe (PUT /pedidos/:id), só que aqui o
 * pedido alvo muda a cada drop — por isso não dá pra usar o hook fixo por
 * pedidoId (`useUpdatePedidoStatus`), a mutação recebe o id como variável. */
function useMoverPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pedidoId, status }: { pedidoId: string; status: PedidoStatus }) =>
      api.put<Pedido>(`/pedidos/${pedidoId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

/**
 * Quadro Kanban por status (pedido de Beatriz) — arrastar um card muda o
 * status do pedido. Drag-and-drop nativo do HTML5 (sem biblioteca nova).
 */
export function KanbanPedidos({ pedidos, fornecedorPorId }: KanbanPedidosProps) {
  const navigate = useNavigate();
  const moverPedido = useMoverPedido();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaSobre, setColunaSobre] = useState<PedidoStatus | null>(null);

  const porStatus = new Map<PedidoStatus, Pedido[]>();
  for (const status of PEDIDO_STATUS) porStatus.set(status, []);
  for (const pedido of pedidos) porStatus.get(pedido.status)?.push(pedido);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {PEDIDO_STATUS.map((status) => {
        const itens = porStatus.get(status) ?? [];
        const cor = COR_STATUS[status];
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setColunaSobre(status);
            }}
            onDragLeave={() => setColunaSobre((atual) => (atual === status ? null : atual))}
            onDrop={(e) => {
              e.preventDefault();
              setColunaSobre(null);
              const pedidoId = e.dataTransfer.getData("text/pedido-id");
              if (pedidoId) moverPedido.mutate({ pedidoId, status });
            }}
            className={`w-64 shrink-0 rounded-lg border border-slate-200 bg-slate-50 ${
              colunaSobre === status ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <div className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${cor.coluna}`}>
              {PEDIDO_STATUS_LABEL[status]} <span className="font-normal opacity-70">({itens.length})</span>
            </div>
            <div className="space-y-2 p-2">
              {itens.map((pedido) => (
                <div
                  key={pedido.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/pedido-id", pedido.id);
                    setArrastando(pedido.id);
                  }}
                  onDragEnd={() => setArrastando(null)}
                  onClick={() => navigate(`/pedidos/${pedido.id}`)}
                  className={`cursor-pointer rounded-md border-l-[3px] bg-white p-2 text-sm shadow-sm hover:shadow ${cor.borda} ${
                    arrastando === pedido.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="font-medium text-slate-800">{pedido.numero_referencia ?? "Sem referência"}</div>
                  <div className="text-xs text-slate-500">{fornecedorPorId.get(pedido.fornecedor_id) ?? pedido.fornecedor_id}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {new Date(pedido.criado_em).toLocaleDateString("pt-BR")} · {pedido.moeda}
                  </div>
                </div>
              ))}
              {!itens.length && <p className="px-1 py-2 text-center text-xs text-slate-400">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
