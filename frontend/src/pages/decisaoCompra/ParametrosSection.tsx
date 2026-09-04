import { useState } from "react";
import { useParametros, useSetParametro } from "../../api/compra";
import { formatarData, formatarDataHora } from "./format";

const inputClass = "w-full rounded-md border border-border-rtx-strong px-3 py-1.5 text-sm focus:border-gold focus:outline-none";
const labelClass = "block text-xs font-medium text-muted-rtx mb-1";

/**
 * Parâmetros do cálculo — usada dentro da Decisão de Compra (recolhida por
 * padrão, como sempre foi) e também na página Configurações (sempre
 * aberta, sem o botão de toggle) — extraída pra um lugar só pra não
 * duplicar a lógica de salvar/PTAX/câmbio desatualizado nos dois lugares.
 */
export function ParametrosSection({ semToggle = false }: { semToggle?: boolean }) {
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

  const mostrarCampos = semToggle || aberto;

  return (
    <section className="rounded-lg border border-border-rtx bg-white p-4">
      {semToggle ? (
        <h2 className="text-sm font-semibold text-ink">Parâmetros do cálculo</h2>
      ) : (
        <button onClick={() => setAberto(!aberto)} className="text-sm font-semibold text-ink">
          Parâmetros do cálculo {aberto ? "▲" : "▼"}
        </button>
      )}
      {mostrarCampos && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campos.map((campo) => {
            const salvandoEste = setParametro.isPending && setParametro.variables?.chave === campo.chave;
            const salvoEste =
              setParametro.isSuccess && !setParametro.isPending && setParametro.variables?.chave === campo.chave;
            return (
              <div key={campo.chave}>
                <label className={labelClass}>
                  {campo.label} {salvandoEste && <span className="text-gold-dark">salvando…</span>}
                  {salvoEste && <span className="text-emerald-600">✓ salvo</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  defaultValue={campo.valor}
                  onKeyDown={(e) => {
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
                    <p className="text-muted-rtx">Comparar cotação comercial entre Santander e Banco do Brasil.</p>
                    <p className="text-muted-rtx">
                      PTAX BCB (referência):{" "}
                      {parametros.ptaxReferencia
                        ? `R$ ${parametros.ptaxReferencia.valor.toFixed(4)} (${formatarData(parametros.ptaxReferencia.data)})`
                        : "indisponível"}
                    </p>
                    <p className={cambioDesatualizado ? "font-medium text-amber-600" : "text-muted-rtx"}>
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
