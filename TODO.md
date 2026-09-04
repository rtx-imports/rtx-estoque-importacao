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
  - Detalhado por Beatriz em 04/09/2026: quer uma coluna "Valor estimado
    c/ impostos" na grade (unitário e total = unitário × quantidade
    sugerida), puxada do `financeiro-gbw` quando essa integração existir.
    **Precisa ficar visualmente marcada como aproximada** (rótulo "aprox."
    ou "≈") — não é o valor final oficial, só uma estimativa. Adicionada
    como coluna no protótipo visual (Artifact "Sistema Visual RTX"), sem
    dado real ainda — cálculo de verdade depende da integração acima.

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
  algumas horas. Checado em 04/09/2026: 2.050/3.210 produtos já com estoque
  sincronizado, backend local rodando e avançando sozinho — sem ação
  pendente, só aguardar (~3h pro resto no ritmo atual, se o processo local
  ficar de pé).
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
- [ ] **Suporte a mais de um usuário** — pedido de Beatriz em 04/09/2026, ao
  discutir o redesenho do frontend. Hoje o sistema tem uma tabela `usuarios`
  no schema (id/nome/email/senha_hash/ativo) mas nenhuma autenticação de
  verdade implementada — é rascunho de fase futura. Permissões por usuário
  (quem pode editar o quê, por fase do processo) ficam pra avaliar depois,
  quando essa tarefa for priorizada — não desenhar agora.
- [x] **Aplicar a paleta/tipografia no React real** — feito em 04/09/2026,
  branch `visual/paleta-rtx`: sidebar com logo real, tokens de cor
  (`frontend/src/index.css`, navy/gold/paper/border/muted/info) aplicados
  em todas as páginas existentes, tipografia trocada pra Geist (principal)
  + Inter (alternativa, fallback no stack) + `tabular-nums` nos números
  financeiros — a pedido de Beatriz, substituindo a escolha inicial
  Sora/IBM Plex Sans do protótipo. IBM Plex Mono mantido só na grade de
  dados/SKU (decisão anterior, familiar ao Bruno). Nada de estrutura/rota
  mudou, só o visual. Também criadas as 3 páginas de projeto futuro que
  só existiam no protótipo (`EstoquePage`, `RastreamentoPage`,
  `PrecosFornecedorPage`) — visual pronto, sem funcionalidade real ainda
  (banner de "conceito" em cada uma), reservando o lugar no menu.
- [ ] **Itens do pedido devem puxar de "Preços por Fornecedor"** — pedido
  de Beatriz em 04/09/2026: a informação mais importante do pedido, além
  das datas previstas, é a quantidade total de rolinhos/placas — hoje o
  formulário "Adicionar item" em `PedidoDetalhePage.tsx` é cadastro livre
  (descrição/quantidade/unidade/preço/JSON de atributos extras); a ideia é
  que passe a consultar a tabela de preço por fornecedor (página
  `PrecosFornecedorPage`, ainda sem backend) em vez de digitar tudo à mão.
  Banner de aviso já colocado na seção Itens da página de detalhe.
  Bloqueado até "Preços por Fornecedor" ganhar dado real (aguardando
  planilhas do setor de importação).
- [ ] **Colorir status do pedido também no seletor de detalhe** — feito em
  04/09/2026: `COR_STATUS` (antes só no Kanban) virou fonte única em
  `pages/pedidos/statusColor.ts`, reusada no `<select>` de status de
  `PedidoDetalhePage.tsx` — cada status agora tem a mesma cor nos dois
  lugares. (Marcado como feito, deixado aqui só pelo rastro da decisão.)
- [x] **Nomes humanizados no upload de documentos** — feito em 04/09/2026:
  `TIPO_DOCUMENTO_LABEL`/`FASE_DOCUMENTO_LABEL` (`api/types.ts`) trocam os
  valores de enum (`invoice_proforma`, `pagamento_inicial`, ...) por texto
  legível no formulário e na tabela de documentos — os valores salvos no
  banco continuam os mesmos, só a exibição mudou.
- [x] **Página Início** — feito em 04/09/2026 (`frontend/src/pages/InicioPage.tsx`,
  rota `/`, item de menu próprio acima de "Compras"), a partir de rascunho
  aprovado no Artifact "Sistema Visual RTX". Painel consolidado, tudo com
  dado real (não mockado): Saúde do estoque/Produtos críticos/Rupturas
  previstas/Cobertura média agregados somando a proposta de cada
  fornecedor ativo no cliente (não existe endpoint de "proposta de
  todos"); Pedidos por status (contagem real via `usePedidos()` sem
  filtro, cores de `statusColor.ts`); Câmbio (mesmo dado do cabeçalho);
  Sincronização de estoque (produtos com `estoque != null` sobre o total).
  "Estoque consolidado" e "Estoque por empresa" (RTX/BG/BW/BRA) ficam
  como placeholder tracejado com "—", já que esses módulos não existem
  ainda — não inventar dado.
- [x] **Páginas Configurações e Usuários** — feito em 04/09/2026, a pedido
  de Beatriz ("faltou configurações e usuários"). Novo grupo "Sistema" no
  rodapé da sidebar. Usuários (`UsuariosPage.tsx`) é conceito/placeholder
  — autenticação real não existe (ver item "Suporte a mais de um usuário"
  acima), banner deixa isso explícito.
  - Correção da usuária logo em seguida: Configurações NÃO é os
    Parâmetros do Cálculo (isso é específico da Decisão de Compra e
    continua só lá, dentro do collapse de sempre — `ParametrosSection`
    ficou extraída em `decisaoCompra/ParametrosSection.tsx` só porque já
    tinha sido movida antes, não porque aparece em Configurações).
    Configurações é pra padrão geral de app.
- [x] **Modo claro/escuro no frontend** — feito de verdade em 04/09/2026
  (estava pendente, virou real quando Configurações pediu conteúdo
  próprio): `frontend/src/theme.ts` (tipos `light`/`dark`/`system`,
  persistido em localStorage, aplicado via `data-theme` na tag `<html>`
  antes do primeiro paint em `main.tsx`). `index.css` ganhou o token
  `--color-surface` (cards eram `bg-white` fixo — trocado por
  `bg-surface` em todo o app) e os overrides de dark pra
  paper/surface/ink/border/muted/info. Sidebar (navy) e dourado não
  mudam de propósito — só a área de conteúdo troca. Seletor em
  Configurações (Claro/Escuro/Sistema), testado nas telas principais.
  Badges semânticos fixos (bg-emerald-100 etc., cores de status/ABC/XYZ)
  não ganharam variante dark ainda — ficam legíveis mas não "elegantes"
  no escuro; ajustar se incomodar no uso real.
