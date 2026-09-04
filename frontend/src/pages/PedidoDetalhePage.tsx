import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useFornecedor } from "../api/fornecedores";
import {
  useAddChecklistItem,
  useAddItem,
  useDeleteChecklistItem,
  useDeleteItem,
  useGerarMatrizChecklist,
  usePedido,
  useToggleChecklistItem,
  useUpdatePedidoStatus,
  useUploadDocumento,
} from "../api/pedidos";
import { FASE_DOCUMENTO_LABEL, FASES_DOCUMENTO, PEDIDO_STATUS, PEDIDO_STATUS_LABEL, TIPO_DOCUMENTO_LABEL, TIPOS_DOCUMENTO } from "../api/types";
import { COR_STATUS } from "./pedidos/statusColor";

const inputClass = "w-full rounded-md border border-border-rtx-strong px-3 py-1.5 text-sm focus:border-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-muted-rtx mb-1";

export function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { data: pedido, isLoading } = usePedido(id);
  const { data: fornecedor } = useFornecedor(pedido?.fornecedor_id);
  const updateStatus = useUpdatePedidoStatus(id ?? "");

  if (isLoading) return <p className="text-sm text-muted-rtx">Carregando...</p>;
  if (!pedido) return <p className="text-sm text-red-600">Pedido não encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/pedidos" className="text-sm text-gold-dark hover:underline">
        ← Voltar para pedidos
      </Link>

      <section className="rounded-lg border border-border-rtx bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-ink">
              {pedido.numero_referencia ?? "Pedido sem referência"}
            </h1>
            <p className="text-sm text-muted-rtx">
              Fornecedor: {fornecedor?.nome ?? pedido.fornecedor_id} · Moeda: {pedido.moeda}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className={labelClass}>Status</label>
            <select
              className={`rounded-md border-0 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold ${COR_STATUS[pedido.status].coluna}`}
              value={pedido.status}
              onChange={(e) => updateStatus.mutate(e.target.value as (typeof PEDIDO_STATUS)[number])}
            >
              {PEDIDO_STATUS.map((status) => (
                <option key={status} value={status}>
                  {PEDIDO_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ChecklistSection pedidoId={pedido.id} checklist={pedido.checklist} />
      <ItensSection pedidoId={pedido.id} itens={pedido.itens} />
      <DocumentosSection pedidoId={pedido.id} documentos={pedido.documentos} />
    </div>
  );
}

/**
 * Checklist por pedido — matriz padrão da RTX (113 itens, 29 grupos, PDF
 * "MATRIZ_CHECK LIST ATUALIZADO") já nasce preenchida em pedidos novos
 * (`semearChecklist` no backend). Agrupado por seção, com progresso geral e
 * por seção; dá pra adicionar itens extras avulsos (sem grupo) também.
 */
function ChecklistSection({
  pedidoId,
  checklist,
}: {
  pedidoId: string;
  checklist: import("../api/types").PedidoChecklistItem[];
}) {
  const addItem = useAddChecklistItem(pedidoId);
  const toggleItem = useToggleChecklistItem(pedidoId);
  const deleteItem = useDeleteChecklistItem(pedidoId);
  const gerarMatriz = useGerarMatrizChecklist(pedidoId);
  const [descricao, setDescricao] = useState("");
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!descricao.trim()) return;
    addItem.mutate(descricao.trim(), { onSuccess: () => setDescricao("") });
  }

  const concluidos = checklist.filter((item) => item.concluido).length;

  // Agrupa preservando a ordem de aparição (mesma ordem da matriz — 1.1, 1.2, ...);
  // itens sem grupo (avulsos, adicionados à mão) ficam num grupo "Outros" ao final.
  const grupos: { nome: string; itens: import("../api/types").PedidoChecklistItem[] }[] = [];
  const indicePorGrupo = new Map<string, number>();
  for (const item of checklist) {
    const nome = item.grupo ?? "Outros";
    if (!indicePorGrupo.has(nome)) {
      indicePorGrupo.set(nome, grupos.length);
      grupos.push({ nome, itens: [] });
    }
    grupos[indicePorGrupo.get(nome)!].itens.push(item);
  }

  function toggleGrupo(nome: string) {
    const proximo = new Set(gruposAbertos);
    if (proximo.has(nome)) proximo.delete(nome);
    else proximo.add(nome);
    setGruposAbertos(proximo);
  }

  return (
    <section className="rounded-lg border border-border-rtx bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Checklist</h2>
        {checklist.length > 0 && (
          <span className="text-xs text-muted-rtx">
            {concluidos} de {checklist.length} concluído{concluidos === 1 ? "" : "s"} (
            {Math.round((concluidos / checklist.length) * 100)}%)
          </span>
        )}
      </div>

      {checklist.length === 0 && (
        <div className="mb-3 rounded-md border border-dashed border-border-rtx-strong bg-paper p-4 text-center">
          <p className="mb-2 text-sm text-muted-rtx">
            Este pedido não tem checklist ainda (foi criado antes da matriz existir).
          </p>
          <button
            onClick={() => gerarMatriz.mutate()}
            disabled={gerarMatriz.isPending}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark disabled:opacity-50"
          >
            {gerarMatriz.isPending ? "Gerando..." : "Gerar matriz padrão RTX (113 itens)"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
        <input
          className={inputClass}
          placeholder="Item avulso (fora da matriz padrão)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <button
          type="submit"
          disabled={addItem.isPending || !descricao.trim()}
          className="shrink-0 rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {!!grupos.length && (
        <div className="max-h-[32rem] space-y-2 overflow-y-auto">
          {grupos.map((grupo) => {
            const feitos = grupo.itens.filter((i) => i.concluido).length;
            const completo = feitos === grupo.itens.length;
            const aberto = gruposAbertos.has(grupo.nome);
            return (
              <div key={grupo.nome} className="rounded-md border border-border-rtx">
                <button
                  type="button"
                  onClick={() => toggleGrupo(grupo.nome)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-paper"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span>{aberto ? "▾" : "▸"}</span>
                    {grupo.nome}
                    {completo && <span className="text-emerald-600">✓</span>}
                  </span>
                  <span className="text-xs text-muted-rtx">
                    {feitos}/{grupo.itens.length}
                  </span>
                </button>
                {aberto && (
                  <ul className="divide-y divide-border-rtx border-t border-border-rtx px-3">
                    {grupo.itens.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={item.concluido}
                          onChange={(e) => toggleItem.mutate({ itemId: item.id, concluido: e.target.checked })}
                        />
                        <span
                          className={`flex-1 text-sm ${item.concluido ? "text-muted-rtx line-through" : "text-ink"}`}
                        >
                          {item.descricao}
                        </span>
                        <button onClick={() => deleteItem.mutate(item.id)} className="text-xs text-red-600 hover:underline">
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ItensSection({ pedidoId, itens }: { pedidoId: string; itens: import("../api/types").PedidoItem[] }) {
  const addItem = useAddItem(pedidoId);
  const deleteItem = useDeleteItem(pedidoId);
  const [form, setForm] = useState({
    descricao: "",
    quantidade: "",
    unidade: "",
    preco_unitario: "",
    atributos_extra: "{}",
  });
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    let atributosExtra: Record<string, unknown> = {};
    try {
      atributosExtra = form.atributos_extra.trim() ? JSON.parse(form.atributos_extra) : {};
    } catch {
      setErro("Atributos extras precisa ser um JSON válido, ex.: {\"largura\": 1.22}");
      return;
    }

    addItem.mutate(
      {
        descricao: form.descricao,
        quantidade: Number(form.quantidade),
        unidade: form.unidade,
        preco_unitario: Number(form.preco_unitario),
        atributos_extra: atributosExtra,
      },
      {
        onSuccess: () => setForm({ descricao: "", quantidade: "", unidade: "", preco_unitario: "", atributos_extra: "{}" }),
        onError: (error) => setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao adicionar item"),
      },
    );
  }

  const totalPedido = itens.reduce((soma, item) => soma + item.valor_total, 0);

  return (
    <section className="rounded-lg border border-border-rtx bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Itens</h2>

      <div className="mb-4 rounded-md border border-info bg-info-bg px-3 py-2 text-xs text-info">
        Pendente (ver TODO.md): os itens do pedido vão passar a puxar a quantidade total de rolinhos/placas direto
        da planilha de Preços por Fornecedor (ajustável) em vez do formulário livre abaixo — é a informação mais
        importante do pedido além das datas previstas. Cadastro manual continua funcionando até lá.
      </div>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição *</label>
          <input
            required
            className={inputClass}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Quantidade *</label>
          <input
            required
            type="number"
            step="any"
            className={inputClass}
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Unidade *</label>
          <input
            required
            placeholder="m2, peca..."
            className={inputClass}
            value={form.unidade}
            onChange={(e) => setForm({ ...form, unidade: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Preço unitário *</label>
          <input
            required
            type="number"
            step="any"
            className={inputClass}
            value={form.preco_unitario}
            onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })}
          />
        </div>
        <div className="sm:col-span-4">
          <label className={labelClass}>Atributos extras (JSON, varia por fornecedor)</label>
          <input
            className={inputClass}
            value={form.atributos_extra}
            onChange={(e) => setForm({ ...form, atributos_extra: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={addItem.isPending}
            className="w-full rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark disabled:opacity-50"
          >
            {addItem.isPending ? "Adicionando..." : "Adicionar item"}
          </button>
        </div>
      </form>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {itens.length === 0 ? (
        <p className="text-sm text-muted-rtx">Nenhum item adicionado ainda.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
              <th className="py-2">Descrição</th>
              <th className="py-2">Qtd</th>
              <th className="py-2">Unidade</th>
              <th className="py-2">Preço unit.</th>
              <th className="py-2">Total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-border-rtx">
                <td className="py-2">{item.descricao}</td>
                <td className="py-2">{item.quantidade}</td>
                <td className="py-2">{item.unidade}</td>
                <td className="py-2">{item.preco_unitario.toFixed(2)}</td>
                <td className="py-2">{item.valor_total.toFixed(2)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-2 text-right text-sm font-medium text-muted-rtx">
                Total do pedido:
              </td>
              <td className="pt-2 text-sm font-semibold text-ink">{totalPedido.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

function DocumentosSection({
  pedidoId,
  documentos,
}: {
  pedidoId: string;
  documentos: import("../api/types").PedidoDocumento[];
}) {
  const uploadDocumento = useUploadDocumento(pedidoId);
  const [tipoDocumento, setTipoDocumento] = useState<string>(TIPOS_DOCUMENTO[0]);
  const [fase, setFase] = useState<string>(FASES_DOCUMENTO[0]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!arquivo) {
      setErro("Selecione um arquivo");
      return;
    }
    uploadDocumento.mutate(
      { file: arquivo, tipo_documento: tipoDocumento, fase },
      {
        onSuccess: () => setArquivo(null),
        onError: (error) => setErro(error instanceof ApiError ? JSON.stringify(error.body) : "Erro ao enviar arquivo"),
      },
    );
  }

  return (
    <section className="rounded-lg border border-border-rtx bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Documentos</h2>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Tipo</label>
          <select className={inputClass} value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_DOCUMENTO_LABEL[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fase</label>
          <select className={inputClass} value={fase} onChange={(e) => setFase(e.target.value)}>
            {FASES_DOCUMENTO.map((f) => (
              <option key={f} value={f}>
                {FASE_DOCUMENTO_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Arquivo</label>
          <input
            type="file"
            className={inputClass}
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={uploadDocumento.isPending}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark disabled:opacity-50"
          >
            {uploadDocumento.isPending ? "Enviando..." : "Enviar documento"}
          </button>
        </div>
      </form>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {documentos.length === 0 ? (
        <p className="text-sm text-muted-rtx">Nenhum documento anexado ainda.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-rtx text-xs uppercase text-muted-rtx">
              <th className="py-2">Tipo</th>
              <th className="py-2">Fase</th>
              <th className="py-2">Versão</th>
              <th className="py-2">Enviado em</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {documentos.map((documento) => (
              <tr key={documento.id} className="border-b border-border-rtx">
                <td className="py-2">{TIPO_DOCUMENTO_LABEL[documento.tipo_documento]}</td>
                <td className="py-2">{FASE_DOCUMENTO_LABEL[documento.fase]}</td>
                <td className="py-2">v{documento.versao}</td>
                <td className="py-2">{new Date(documento.enviado_em).toLocaleString("pt-BR")}</td>
                <td className="py-2 text-right">
                  <a
                    href={`/api${documento.arquivo_url}`}
                    className="text-xs text-gold-dark hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Baixar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
