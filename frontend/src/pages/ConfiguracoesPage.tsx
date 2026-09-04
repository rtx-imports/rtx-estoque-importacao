import { ParametrosSection } from "./decisaoCompra/ParametrosSection";

/**
 * Configurações — mesmos parâmetros do cálculo que já existiam dentro da
 * Decisão de Compra (câmbio, lead time, cobertura...), só que num lugar
 * dedicado, sempre visível (sem precisar abrir o collapse). Dado real, a
 * mesma fonte (`useParametros`/`useSetParametro`) — não é duplicado.
 */
export function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Configurações</h1>
        <p className="text-sm text-muted-rtx">
          Parâmetros do cálculo de compra — os mesmos usados na Decisão de Compra, num lugar fixo.
        </p>
      </div>

      <ParametrosSection semToggle />
    </div>
  );
}
