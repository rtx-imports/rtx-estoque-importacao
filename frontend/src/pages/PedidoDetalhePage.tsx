import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useFornecedor } from "../api/fornecedores";
import {
  useAddItem,
  useDeleteItem,
  usePedido,
  useUpdatePedidoStatus,
  useUploadDocumento,
} from "../api/pedidos";
import { FASES_DOCUMENTO, PEDIDO_STATUS, TIPOS_DOCUMENTO } from "../api/types";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

export function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { data: pedido, isLoading } = usePedido(id);
  const { data: fornecedor } = useFornecedor(pedido?.fornecedor_id);
  const updateStatus = useUpdatePedidoStatus(id ?? "");

  if (isLoading) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (!pedido) return <p className="text-sm text-red-600">Pedido não encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/pedidos" className="text-sm text-blue-600 hover:underline">
        ← Voltar para pedidos
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {pedido.numero_referencia ?? "Pedido sem referência"}
            </h1>
            <p className="text-sm text-slate-500">
              Fornecedor: {fornecedor?.nome ?? pedido.fornecedor_id} · Moeda: {pedido.moeda}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={pedido.status}
              onChange={(e) => updateStatus.mutate(e.target.value as (typeof PEDIDO_STATUS)[number])}
            >
              {PEDIDO_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ItensSection pedidoId={pedido.id} itens={pedido.itens} />
      <DocumentosSection pedidoId={pedido.id} documentos={pedido.documentos} />
    </div>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Itens</h2>

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
            className="w-full rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addItem.isPending ? "Adicionando..." : "Adicionar item"}
          </button>
        </div>
      </form>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item adicionado ainda.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
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
              <tr key={item.id} className="border-b border-slate-100">
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
              <td colSpan={4} className="pt-2 text-right text-sm font-medium text-slate-600">
                Total do pedido:
              </td>
              <td className="pt-2 text-sm font-semibold text-slate-800">{totalPedido.toFixed(2)}</td>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Documentos</h2>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Tipo</label>
          <select className={inputClass} value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fase</label>
          <select className={inputClass} value={fase} onChange={(e) => setFase(e.target.value)}>
            {FASES_DOCUMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
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
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadDocumento.isPending ? "Enviando..." : "Enviar documento"}
          </button>
        </div>
      </form>
      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum documento anexado ainda.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2">Tipo</th>
              <th className="py-2">Fase</th>
              <th className="py-2">Versão</th>
              <th className="py-2">Enviado em</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {documentos.map((documento) => (
              <tr key={documento.id} className="border-b border-slate-100">
                <td className="py-2">{documento.tipo_documento}</td>
                <td className="py-2">{documento.fase}</td>
                <td className="py-2">v{documento.versao}</td>
                <td className="py-2">{new Date(documento.enviado_em).toLocaleString("pt-BR")}</td>
                <td className="py-2 text-right">
                  <a
                    href={`/api${documento.arquivo_url}`}
                    className="text-xs text-blue-600 hover:underline"
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
