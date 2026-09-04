# TODO.md — Pendências ativas

> Lista de trabalho, não decisões fechadas (ver DECISIONS.md pra isso). Dividida
> entre o que só a Beatriz resolve (dado externo, decisão de negócio, acesso a
> sistema de terceiro) e o que fica pro lado do sistema/próximas sessões.

## Pendências da Beatriz

- [ ] **Planilha de referência de custo unitário** — pra confirmar/corrigir o
  bug de moeda encontrado em `custos.json` (arquivo diz `"moeda": "BRL"` mas é
  usado como se fosse USD em todo o sistema — ver seção "Bug em aberto"
  abaixo). Sem essa planilha não dá pra saber com certeza se é bug ou não.
- [ ] **NCM** de cada produto — combinou de pegar com alguém da empresa.
- [ ] **Client Code** de cada produto (código do cliente, hoje é o campo
  `item_code`) — idem, pegar com alguém da empresa.
- [ ] **Modelo de planilha de pedido** — por fornecedor ou um modelo geral só
  — pro Bruno espelhar ao mandar pedido pro fornecedor. Export ainda não
  começou, aguardando isso.
- [x] **ClickUp**: modelo (11 status + matriz de 113 itens de checklist)
  extraído manualmente dos PDFs e portado nativamente pro sistema — resolvido
  sem precisar de token. Pedidos que já estão em andamento no ClickUp **não**
  serão importados pra cá por enquanto (confirmado com Beatriz).
- [ ] **Emissão de nota fiscal** — vai em `financeiro-rtx` (fora deste
  sistema).
- [ ] **Venda da RTX para as lojas (BG/BW/BRA)** — vai em `financeiro-rtx`.
- [ ] **Trâmites financeiros em geral** — ajustar em `financeiro-rtx`.
- [ ] **Cálculo de imposto de importação sai daqui** — removido o campo
  "Imposto de importação (%)" de Parâmetros do cálculo e a coluna derivada
  "Custo unit. final de importação" da grade (a conta ficou "muito doida" —
  Beatriz pediu pra tirar). O cálculo certo de custo final de importação
  (com impostos) vai morar no `financeiro-gbw`; este sistema só vai
  **importar** o resultado de lá quando essa integração existir — ainda não
  desenhada.

## Estoque consolidado por CNPJ (RTX/BW/BG/BRA) — sessão dedicada

Confirmado: começa do zero, sessão própria. Envolve pelo menos:
- Estoque separado por empresa (cada uma tem sua própria conta/estoque no
  Tiny — não compartilham, já confirmado nesta sessão).
- Gerenciamento de galpões/localização física.
- Reposição, entrada e saída de estoque (hoje "Estoque Atual" é só lido do
  Tiny da RTX, sem entrada/saída modelada).

## Pendências do sistema / próximas sessões

- [ ] **Pesquisar acompanhamento de carga via MarineTraffic (ou equivalente)
  em tempo real** — atribuído a mim: levantar como integrar (API paga? scraping?
  que infos dá pra puxar — ETA, transbordo, posição) pra eventualmente
  automatizar os itens manuais da matriz de checklist (3.3, 4.1). Ainda não
  pesquisado.
- [ ] **Bug em aberto — moeda de `custos.json`**: arquivo portado do
  `rtx-pedidos` tem `"moeda": "BRL"`, mas os valores são tratados como dólar
  em todo o sistema novo (inclusive multiplicados por câmbio de novo em
  "Valor Atual"/"Valor Trânsito", e usados sem conversão pra preencher
  `produtos.custo_unit_usd`, que É tratado como dólar em compras). Evidência:
  no `rtx-pedidos` original, esses valores são usados DIRETO sem nenhuma
  conversão de câmbio; e os maiores valores da tabela chegam a US$248,92/un.,
  implausível em dólar pra um rolo de vinil, plausível em real. **Não
  corrigido ainda** — aguardando a planilha de referência da Beatriz antes de
  mexer, por ser cálculo financeiro sensível.
- [ ] **Terminar sincronização de estoque completa** — job automático rodando
  sozinho (30 produtos/5min), cobre o catálogo inteiro (~3.200 produtos) em
  algumas horas.
- [ ] **width e lenght das placas vazio** - investigar o motivo e padrão disso na planilha de pedido e invoice 
- [ ] **3 SKUs classificados errado como "rolinho"** (na prática são
  espátulas/acessórios, sem dimensão real) — achado ao investigar
  Width/Length vazio; baixa prioridade, mas fica registrado.
- [ ] **Modelo de exportação da planilha de pedido** — bloqueado até a
  Beatriz mandar: modelo de planilha, NCM, Client Code e valores unitários
  confirmados.
- [ ] **Risco `painel-gbw` vs `painel-gbwv2`** — confirmar com a Beatriz qual
  está de fato em produção antes de assumir a fonte de dados de venda/estoque
  Full, caso a equipe migre algo sem avisar (ver DECISIONS.md / memória da
  sessão).
- [ ] **Atualizar `custos.json`** quando a planilha de custo nova chegar (o
  gerador em si, `gen-custos.ts`, não foi portado — precisa rodar no
  `rtx-pedidos` e copiar o resultado, ou portar o gerador).
- [ ] **Ajuste na tabela "Decisão de Compra"** - produto (ex.: DG3111G
Self Adhesive Vinyl Glossy - 80/80GSM (Samples 02 pure white film)) tenha um conjunto de varias linhas das variações de tamanho dele - fica visualmente mais confortável - consultar em `rtx-pedidos`
