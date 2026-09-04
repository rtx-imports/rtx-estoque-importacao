import { useState } from "react";
import { aplicarTema, lerTemaSalvo, type Tema } from "../theme";

const OPCOES_TEMA: { valor: Tema; label: string; desc: string }[] = [
  { valor: "light", label: "Claro", desc: "Sempre claro, não importa o SO" },
  { valor: "dark", label: "Escuro", desc: "Sempre escuro, não importa o SO" },
  { valor: "system", label: "Sistema", desc: "Segue a preferência do computador" },
];

/**
 * Configurações do app — não é o mesmo que "Parâmetros do cálculo" (isso
 * fica só dentro da Decisão de Compra, é específico do motor de compra).
 * Aqui mora o que é padrão de aplicativo: aparência por enquanto, mais
 * itens entram aqui conforme surgirem (idioma, notificações...).
 */
export function ConfiguracoesPage() {
  const [tema, setTema] = useState<Tema>(() => lerTemaSalvo());

  function escolher(valor: Tema) {
    setTema(valor);
    aplicarTema(valor);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Configurações</h1>
        <p className="text-sm text-muted-rtx">Preferências gerais do aplicativo.</p>
      </div>

      <section className="rounded-lg border border-border-rtx bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">Aparência</h2>
        <p className="mb-3 text-xs text-muted-rtx">Escolha como o RTX Imports aparece pra você neste navegador.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPCOES_TEMA.map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => escolher(opcao.valor)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                tema === opcao.valor
                  ? "border-gold bg-gold/10"
                  : "border-border-rtx-strong hover:border-border-rtx-strong hover:bg-paper"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{opcao.label}</span>
                {tema === opcao.valor && <span className="text-gold-dark">✓</span>}
              </div>
              <p className="mt-0.5 text-xs text-muted-rtx">{opcao.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border-rtx-strong bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Mais configurações</h2>
        <p className="mt-1 text-sm text-muted-rtx">
          Reservado pra outros padrões de app conforme surgirem (idioma, notificações, etc.). Os Parâmetros do
          Cálculo (câmbio, lead time, cobertura...) continuam dentro da Decisão de Compra — são específicos do
          motor de compra, não configuração geral do app.
        </p>
      </section>
    </div>
  );
}
