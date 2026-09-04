import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProposta } from "../api/compra";
import { useFornecedores } from "../api/fornecedores";
import { useTiposProduto } from "../api/tiposProduto";
import { CurvaAbcTab } from "./decisaoCompra/CurvaAbcTab";
import { CurvaXyzTab } from "./decisaoCompra/CurvaXyzTab";
import { GradePrincipal } from "./decisaoCompra/GradePrincipal";
import { KpiCards } from "./decisaoCompra/KpiCards";
import { ParametrosSection } from "./decisaoCompra/ParametrosSection";
import { RevisaoDrawer } from "./decisaoCompra/RevisaoDrawer";
import { SimulacoesTab } from "./decisaoCompra/SimulacoesTab";

const inputClass = "w-full rounded-md border border-border-rtx-strong px-3 py-1.5 text-sm focus:border-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-muted-rtx mb-1";

/** Sentinela pra fornecedores sem nenhum tipo_produto cadastrado — não é um tipo de verdade. */
const TAB_OUTROS = "outros";

function capitalizar(texto: string): string {
  return texto.length ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

/**
 * Decisão de Compra — central de apoio à decisão pra compras, não uma tela
 * operacional de estoque/logística/acompanhamento de pedido (essas ficam na
 * página Pedidos). Responde: o que comprar, quanto, quanto vai custar, quando
 * o estoque acaba e o impacto financeiro — termina na sugestão + planilha de
 * compra; nunca controla recebimento/logística.
 */
export function CompraPage() {
  const navigate = useNavigate();
  const { data: fornecedores } = useFornecedores(true);
  const { data: tiposProduto } = useTiposProduto();
  const [tab, setTab] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  const outrosExistem = (fornecedores ?? []).some((f) => f.tipos_produto.length === 0);
  const abas = [
    ...(tiposProduto ?? []).map((t) => ({ tipo: t.nome, label: capitalizar(t.nome) + "s" })),
    ...(outrosExistem ? [{ tipo: TAB_OUTROS, label: "Outros" }] : []),
  ];
  const fornecedoresDoTab = (fornecedores ?? []).filter((f) =>
    tab === TAB_OUTROS ? f.tipos_produto.length === 0 : f.tipos_produto.includes(tab),
  );

  useEffect(() => {
    if (abas.length && !abas.some((a) => a.tipo === tab)) setTab(abas[0].tipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposProduto?.length, outrosExistem]);

  useEffect(() => {
    setFornecedorId(fornecedoresDoTab.length === 1 ? fornecedoresDoTab[0].id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fornecedores?.length]);

  const fornecedor = fornecedoresDoTab.find((f) => f.id === fornecedorId);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border-rtx bg-surface p-4">
        <div className="mb-3 flex gap-1">
          {abas.map((aba) => (
            <button
              key={aba.tipo}
              onClick={() => setTab(aba.tipo)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (tab === aba.tipo ? "bg-navy text-white" : "bg-paper text-muted-rtx hover:bg-border-rtx")
              }
            >
              {aba.label}
            </button>
          ))}
        </div>

        {fornecedoresDoTab.length === 0 && (
          <p className="text-sm text-muted-rtx">
            Nenhum fornecedor cadastrado como "{abas.find((a) => a.tipo === tab)?.label}" ainda — ajuste o "Tipo de
            produto padrão" na tela de Fornecedores.
          </p>
        )}
        {fornecedoresDoTab.length > 1 && (
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select className={inputClass} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione um fornecedor...</option>
              {fornecedoresDoTab.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {fornecedoresDoTab.length === 1 && (
          <p className="text-sm text-muted-rtx">
            Fornecedor: <span className="font-medium">{fornecedoresDoTab[0].nome}</span>
          </p>
        )}
      </section>

      {fornecedor && <DecisaoCompraFornecedor fornecedorId={fornecedor.id} fornecedorNome={fornecedor.nome} onPedidoGerado={(id) => navigate(`/pedidos/${id}`)} />}
    </div>
  );
}

type AbaInterna = "grade" | "abc" | "xyz" | "simulacoes";
const ABAS_INTERNAS: { id: AbaInterna; label: string }[] = [
  { id: "grade", label: "Decisão de Compra" },
  { id: "abc", label: "Curva ABC" },
  { id: "xyz", label: "Curva XYZ" },
  { id: "simulacoes", label: "Simulações" },
];

function DecisaoCompraFornecedor({
  fornecedorId,
  fornecedorNome,
  onPedidoGerado,
}: {
  fornecedorId: string;
  fornecedorNome: string;
  onPedidoGerado: (id: string) => void;
}) {
  const { data: proposta, isLoading } = useProposta(fornecedorId);
  const [abaInterna, setAbaInterna] = useState<AbaInterna>("grade");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [drawerAberto, setDrawerAberto] = useState(false);

  // Reseta seleção/ajustes ao trocar de fornecedor e pré-seleciona quem tem necessidade > 0
  // (o comum é o comprador querer todos os itens sugeridos — ele desmarca o que não quer).
  useEffect(() => {
    setOverrides({});
    if (proposta) {
      setSelecionados(new Set(proposta.itens.filter((i) => i.necessidade > 0).map((i) => i.sku)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedorId, proposta?.itens.length]);

  if (isLoading || !proposta) {
    return (
      <section className="rounded-lg border border-border-rtx bg-surface p-4">
        <p className="text-sm text-muted-rtx">Calculando proposta...</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <KpiCards kpis={proposta.kpis} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {ABAS_INTERNAS.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaInterna(aba.id)}
              className={
                "rounded-md border-b-2 px-3 py-1.5 text-sm font-medium " +
                (abaInterna === aba.id ? "border-gold text-ink" : "border-transparent text-muted-rtx hover:text-ink")
              }
            >
              {aba.label}
            </button>
          ))}
        </div>
        {abaInterna === "grade" && (
          <button
            onClick={() => setDrawerAberto(true)}
            disabled={!selecionados.size}
            className="rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-navy hover:bg-gold-dark disabled:opacity-50"
          >
            Revisar e Exportar ({selecionados.size})
          </button>
        )}
      </div>

      {abaInterna === "grade" && <ParametrosSection />}

      {abaInterna === "grade" &&
        (proposta.itens.length === 0 ? (
          <section className="rounded-lg border border-border-rtx bg-surface p-4">
            <p className="text-sm text-muted-rtx">
              Nenhum produto desse tipo precisa de atenção agora — estoque + trânsito cobrem a demanda projetada.
            </p>
          </section>
        ) : (
          <GradePrincipal
            itens={proposta.itens}
            overrides={overrides}
            setOverrides={setOverrides}
            selecionados={selecionados}
            setSelecionados={setSelecionados}
            cambio={proposta.params.cambio}
          />
        ))}

      {abaInterna === "abc" && <CurvaAbcTab itens={proposta.itensTodos} />}
      {abaInterna === "xyz" && <CurvaXyzTab itens={proposta.itensTodos} />}
      {abaInterna === "simulacoes" && <SimulacoesTab fornecedorId={fornecedorId} paramsAtual={proposta.params} />}

      <RevisaoDrawer
        aberto={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        fornecedorId={fornecedorId}
        fornecedorNome={fornecedorNome}
        itensGrade={proposta.itens}
        selecionados={selecionados}
        overrides={overrides}
        cambio={proposta.params.cambio}
        onPedidoGerado={onPedidoGerado}
      />
    </div>
  );
}
