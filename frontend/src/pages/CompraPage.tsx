import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParametros, useProposta, useSetParametro } from "../api/compra";
import { useFornecedores } from "../api/fornecedores";
import { useTiposProduto } from "../api/tiposProduto";
import { CurvaAbcTab } from "./decisaoCompra/CurvaAbcTab";
import { CurvaXyzTab } from "./decisaoCompra/CurvaXyzTab";
import { formatarData, formatarDataHora } from "./decisaoCompra/format";
import { GradePrincipal } from "./decisaoCompra/GradePrincipal";
import { KpiCards } from "./decisaoCompra/KpiCards";
import { RevisaoDrawer } from "./decisaoCompra/RevisaoDrawer";
import { SimulacoesTab } from "./decisaoCompra/SimulacoesTab";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

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
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex gap-1">
          {abas.map((aba) => (
            <button
              key={aba.tipo}
              onClick={() => setTab(aba.tipo)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (tab === aba.tipo ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {aba.label}
            </button>
          ))}
        </div>

        {fornecedoresDoTab.length === 0 && (
          <p className="text-sm text-slate-500">
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
          <p className="text-sm text-slate-600">
            Fornecedor: <span className="font-medium">{fornecedoresDoTab[0].nome}</span>
          </p>
        )}
      </section>

      {fornecedor && <DecisaoCompraFornecedor fornecedorId={fornecedor.id} fornecedorNome={fornecedor.nome} onPedidoGerado={(id) => navigate(`/pedidos/${id}`)} />}
    </div>
  );
}

function ParametrosSection() {
  const { data: parametros } = useParametros();
  const setParametro = useSetParametro();
  const [aberto, setAberto] = useState(false);

  if (!parametros) return null;

  const campos: { chave: string; label: string; valor: number }[] = [
    { chave: "lead_time_dias", label: "Lead time (dias)", valor: parametros.leadTimeDias },
    { chave: "cobertura_minima_meses", label: "Cobertura mínima (meses)", valor: parametros.coberturaMinimaMeses },
    { chave: "crescimento_mensal", label: "Crescimento mensal (fator, ex: 1.10 = +10%)", valor: parametros.crescimentoMensal },
    { chave: "cambio", label: "Câmbio", valor: parametros.cambio },
    { chave: "janela_meses", label: "Janela de venda (meses)", valor: parametros.janelaMeses },
    {
      chave: "estoque_critico_dias",
      label: "Estoque crítico (dias)",
      valor: parametros.estoqueCriticoDias,
    },
  ];

  const cambioDesatualizado =
    !parametros.cambioAtualizadoEm ||
    Date.now() - new Date(parametros.cambioAtualizadoEm).getTime() > 24 * 60 * 60 * 1000;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <button onClick={() => setAberto(!aberto)} className="text-sm font-semibold text-slate-800">
        Parâmetros do cálculo {aberto ? "▲" : "▼"}
      </button>
      {aberto && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campos.map((campo) => {
            const salvandoEste = setParametro.isPending && setParametro.variables?.chave === campo.chave;
            const salvoEste =
              setParametro.isSuccess && !setParametro.isPending && setParametro.variables?.chave === campo.chave;
            return (
            <div key={campo.chave}>
              <label className={labelClass}>
                {campo.label} {salvandoEste && <span className="text-blue-500">salvando…</span>}
                {salvoEste && <span className="text-emerald-600">✓ salvo</span>}
              </label>
              <input
                type="number"
                step="any"
                className={inputClass}
                defaultValue={campo.valor}
                onKeyDown={(e) => {
                  // Enter salva na hora — sem isso, quem digita e aperta Enter (esperando
                  // que já tenha valido) e não clica em outro campo nunca dispara o onBlur,
                  // então o valor novo nunca chega a ser salvo nem a refletir na grade.
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                onBlur={(e) => {
                  const valor = e.target.value;
                  if (valor && Number(valor) !== campo.valor) {
                    setParametro.mutate({ chave: campo.chave, valor });
                  }
                }}
              />
              {campo.chave === "cambio" && (
                <div className="mt-1 space-y-0.5 text-xs">
                  <p className="text-slate-500">Comparar cotação comercial entre Santander e Banco do Brasil.</p>
                  <p className="text-slate-500">
                    PTAX BCB (referência):{" "}
                    {parametros.ptaxReferencia
                      ? `R$ ${parametros.ptaxReferencia.valor.toFixed(4)} (${formatarData(parametros.ptaxReferencia.data)})`
                      : "indisponível"}
                  </p>
                  <p className={cambioDesatualizado ? "font-medium text-amber-600" : "text-slate-500"}>
                    {parametros.cambioAtualizadoEm
                      ? `Ajustado em ${formatarDataHora(parametros.cambioAtualizadoEm)}${
                          cambioDesatualizado ? " — confira se ainda vale" : ""
                        }`
                      : "Nunca ajustado manualmente — usando valor padrão do sistema"}
                  </p>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </section>
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
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Calculando proposta...</p>
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
                "rounded-md px-3 py-1.5 text-sm font-medium " +
                (abaInterna === aba.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100")
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
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Revisar e Exportar ({selecionados.size})
          </button>
        )}
      </div>

      {abaInterna === "grade" && <ParametrosSection />}

      {abaInterna === "grade" &&
        (proposta.itens.length === 0 ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">
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
