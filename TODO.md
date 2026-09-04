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

- [x] **Pesquisar acompanhamento de carga via MarineTraffic (ou equivalente)
  em tempo real** — pesquisado em 04/09/2026. Resumo: a peça útil é a
  Container Tracking API (ETA preditivo, eventos de viagem, congestionamento
  de terminal, webhooks), mas é produto separado do plano web e vendido via
  sales (Kpler) — tier Essential ~US$100/mês (1 navio, 300 notificações/mês),
  Enterprise sob consulta. Alternativa mais previsível em preço: Datalastic.
  Relatório completo em `material de apoio para o sistema
  estoque-importação\Relatorio_MarineTraffic_API.html`. Falta decidir se
  vale a pena contratar antes de integrar (ver custo-benefício no relatório)
  — depende de volume real de containers/mês, ainda não levantado.
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
- [x] **width e lenght das placas vazio** - investigado e corrigido em
  04/09/2026 (decisão 30 do DECISIONS.md): causa era SKU de kit ("Kit de
  5"/"Kit de 8") usando dialeto diferente do SKU de peça avulsa.
  `dimensaoPlaca` agora casa por sufixo de SKU com a peça avulsa
  correspondente já medida — recupera 64 dos 229 que estavam vazios. Os
  ~165 restantes (sem par avulso na tabela) continuam "—" de propósito
  (regex na descrição foi cogitado e descartado de novo, mesma razão da
  decisão 24 — não inventar medida).
- [x] **3 SKUs classificados errado como "rolinho"** (na prática são
  espátulas/acessórios, sem dimensão real) — corrigido em 04/09/2026:
  criado tipo `acessorio` (cadastro dinâmico, decisão 27) e reclassificados
  `01415ESCMFELTR`, `01415ESDEFELTR`, `01415ESPRIGIDA`. Ainda sem vínculo
  com fornecedor (`fornecedor_tipos_produto`) — por isso somem da grade de
  Decisão de Compra por enquanto. **Pendência de negócio**: confirmar com
  Beatriz qual fornecedor vende essas espátulas e se devem aparecer em
  algum lugar do sistema (grade separada? não faz sentido width/length ali).
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
- [x] **Ajuste na tabela "Decisão de Compra"** - implementado em 04/09/2026
  (decisão 31 do DECISIONS.md): variações de tamanho do mesmo produto agora
  mesclam a célula Item/Descrição (rowspan), mesmo padrão do `rtx-pedidos`
  (`grpKey`/`start`/`span` em `src/api/pages.ts`). Precisou reordenar a
  grade por Item Code (não só SKU) dentro de cada NCM pra as variações
  ficarem adjacentes.
