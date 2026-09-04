# DECISIONS.md — Decididas vs. pendentes

## Contexto adicional (recebido depois do rascunho inicial)

O Supabase compartilhado por `financeiro-gbw` e `painel-gbw` acabou de passar
por um upgrade forçado por volume: banco em 12 GB, 32 GB de memória, 8 vCPUs —
já ultrapassando US$400/mês. Isso não significa migrar os sistemas existentes
agora (essa avaliação de servidor próprio vs. cloud gerenciada segue em
aberto, à parte, e não afeta este projeto), mas muda o peso de qualquer
decisão que aproximasse este sistema novo do Supabase: cada byte de banco ou
storage colocado lá contribui para o mesmo custo que já está subindo sem
controle. Por isso este sistema **não pode aumentar essa dependência** — ver
decisão 11 abaixo.

## Correção de um fato registrado errado

**`rtx-pedidos` NÃO é legado nem está fora de escopo** — correção às decisões 1
e 5 abaixo (que o classificavam assim). Investigação mostrou: último commit é
recente, o sistema **está em produção no Railway agora**, e é usado **na
prática** para a decisão de compra (confirmado por Beatriz). Um commit recente
de Gustavo (sócio responsável pela parte de desenvolvimento, junto com
Beatriz) já tinha começado a consolidar o projeto para migrá-lo para a org
`rtx-imports` — a mesma direção que este projeto está tomando agora, de forma
independente. Ver decisão 12 abaixo para o que isso muda no escopo.

## Decididas

1. **Repositório novo e separado** de `financeiro-gbw` e de
   `C:\Users\Beatriz BW\Desktop\projetos-antigos\rtx-pedidos` (sistema em
   produção, não legado — ver correção acima e decisão 12). Nenhum código foi
   copiado de nenhum dos dois ainda. Repositório GitHub criado em
   `rtx-imports/rtx-estoque-importacao`.
2. **MVP = módulo de Pedido apenas**: cadastro de fornecedores, criação de
   pedido com itens, exportação da planilha no formato do fornecedor, anexo da
   invoice proforma. Nenhuma outra fase entra nesta iteração — decisão 12
   adiciona um módulo novo (decisão de compra), mas não muda o que o módulo de
   Pedido em si faz.
3. **Schema de item de pedido é flexível por fornecedor**, não um conjunto
   fixo de colunas — confirmado pelos dois exemplos reais de proforma
   recebidos (rolos vs. placas têm estruturas de item completamente
   diferentes).
4. **Fases do processo nascem modeladas granularmente** (status, anexos e
   observações por fase, não um campo único por pedido) — réplica intencional
   da estrutura do ClickUp atual, mesmo que o MVP só popule a fase `pedido`.
5. **Tiny ERP é somente leitura** para este sistema, quando a integração
   entrar (fora do MVP) — regra que funcionou bem no `rtx-pedidos` (ver
   correção acima) e evita risco de o novo sistema escrever no ERP por
   engano.
6. **NF de transferência RTX ↔ empresa de venda é etapa obrigatória**, não
   opcional, quando essa fase for implementada (fora do MVP).
7. **Banco do MVP: Postgres add-on do Railway (isolado), não Supabase**
   (resolve o antigo PENDENTE #3). Motivo: zero contribuição para a conta do
   Supabase já em US$400+/mês; resolve também, por consequência, a tensão do
   antigo PENDENTE #2.
8. **Acesso a banco via driver Postgres puro** (`pg`/`postgres.js`), não SDK
   do Supabase (resolve o antigo PENDENTE #2) — consequência direta da
   decisão 7: sem Supabase no MVP, não há SDK proprietário a evitar.
9. **Autenticação do MVP: login usuário/senha simples, sem RBAC completo**
   (resolve o antigo PENDENTE #8). RBAC só faz sentido quando existir mais de
   um perfil de uso — isso começa a partir do módulo de Pagamento (Financeiro
   entra).
10. **Repositório `.github` da organização: já existe** (resolve o antigo
    PENDENTE #5) — `rtx-imports/.github` no GitHub, com cópia local em
    `Desktop\rtx-imports\.github`, contendo o pacote completo
    (CONTRIBUTING.md, COMMIT_CONVENTION.md, PULL_REQUEST_TEMPLATE.md,
    ISSUE_TEMPLATE/, CODE_OF_CONDUCT.md, profile/README.md). Nada a criar
    aqui; só seguir os padrões já publicados.
11. **"Vida fora do Supabase" é requisito de longo prazo deste projeto, não
    só uma escolha pontual do MVP.** Cada decisão futura (storage de anexos,
    autenticação, fila de jobs, etc.) deve preferir uma opção que funcione
    tanto em um VPS/servidor próprio quanto em Railway, mantendo a
    reversibilidade já prevista no desenho original. Isso não implica migrar
    `financeiro-gbw`/`painel-gbw` — essa avaliação segue separada e não deve
    ser antecipada por este projeto.
    **Nuance importante (corrigida por Beatriz):** essa regra é sobre não
    **aumentar banco/storage/compute** no projeto Supabase compartilhado — não
    é sobre evitar dependência de dado entre sistemas do grupo. Os sistemas da
    RTX já são interdependentes por natureza (painel-gbw depende do Tiny, que
    depende do marketplace) — ler dado de venda do painel-gbw (só leitura, sem
    escrever nem crescer o banco de lá) é só mais um elo normal dessa cadeia,
    não uma dependência a evitar. O que continua valendo é não criar banco ou
    storage **próprio deste sistema** dentro do Supabase compartilhado.
12. **A decisão de compra (quanto pedir de cada SKU) passa a ser tomada
    dentro deste sistema**, não só o registro/acompanhamento do pedido já
    decidido. Confirmado por Beatriz: o processo de importação e estoque
    começa pela decisão do sócio Bruno sobre quanto comprar — isso precisa
    estar aqui, não num sistema à parte. Na prática isso significa absorver o
    motor de cálculo do `rtx-pedidos` (fórmula de reposição por demanda ×
    cobertura − estoque − trânsito, plano de compra mês a mês, classificação
    ABC — todas funções puras, testadas, sem acoplamento a infraestrutura) como
    um módulo novo, **anterior** ao módulo de Pedido no fluxo. Não trazer a
    parte de sincronização do `rtx-pedidos` (Tiny desligado, scraping do
    ClickUp, arquivos JSON manuais no volume do Railway, dependência do
    Supabase compartilhado para dado de venda) — é o tipo de acoplamento que a
    decisão 11 já descartou.
13. **Os itens do pedido nascem da proposta de compra, não de digitação
    manual.** Quando o módulo de decisão de compra existir, "criar pedido"
    passa a ser "gerar pedido a partir da proposta aprovada" — os SKUs e
    quantidades que saíram do cálculo/ajuste na tela viram os itens do pedido
    automaticamente, em vez do cadastro manual que o MVP usa hoje (que
    continua existindo como fallback/ajuste pontual). Além disso, a
    reconciliação entre proforma e invoice final — já prevista em
    `pedido_documentos.versao` no nível de documento — também precisa
    acontecer nos **itens**: quando a invoice final vem com quantidade
    diferente da proforma, o item do pedido precisa refletir isso, não só o
    anexo. Ainda não desenhado, registrado como requisito para quando essa
    fase começar.
14. **Sequenciamento: decisão de compra passa a ser a próxima prioridade**,
    à frente de terminar de validar o módulo de Pedido (revisa a decisão 13
    original, que dizia o contrário — confirmado por Beatriz). Durante a
    transição, **`rtx-pedidos` continua no ar em uso normal por Bruno**, sem
    nenhuma mudança lá; este projeto só lê o código dele como referência até o
    módulo novo estar pronto e validado.
15. **Venda vem por leitura do painel-gbw** (mesma fonte que o `rtx-pedidos`
    já usa) — não é uma dependência a evitar, ver nuance da decisão 11: ler
    dado de outro sistema do grupo é normal, o que se evita é aumentar
    banco/storage próprio no Supabase compartilhado. Ressalva de Beatriz: essa
    leitura deve ser abstraída (não espalhar SDK/chamada direta do Supabase
    pelo código) para poder trocar a fonte mais adiante sem reescrever o
    módulo.
16. ~~Primeira versão do módulo calcula só a necessidade de compra por
    produto... Plano de compra de 6 meses... fica para depois~~ — **superada
    pela decisão 21**: Beatriz pediu explicitamente pra trazer o plano de 6
    meses já nesta rodada, ao ver o padrão do `rtx-pedidos` em produção.
    Classificação ABC e valorização de estoque em 3 estágios continuam fora
    de escopo por enquanto (não foram pedidas).
17. **Minimizar digitação manual sempre que der pra automatizar — princípio
    geral do projeto, não só deste módulo.** Confirmado por Beatriz: mais mão
    humana digitando é mais chance de erro; quando uma opção evita digitação
    usando dado que o sistema já tem/controla, essa opção é preferida mesmo
    que dê mais trabalho pra construir. Primeira aplicação concreta: **"em
    trânsito" deixou de ser tabela digitada manualmente** — agora é derivado
    ao vivo da soma dos itens de pedidos cujo status está entre `embarcado` e
    antes de `finalizado` (`embarcado`, `aguardando_desembaraco`,
    `em_desova`, `conferencia`). **Estoque atual continua manual por
    enquanto** — automatizar de verdade exigiria saber também o que *sai*
    (transferência RTX → empresa de venda), que é fase futura reservada
    (`nf_transferencia`, decisão 6); quando essa fase existir, estoque também
    vira derivado (entrada por pedido finalizado − saída por transferência),
    em vez de editado na tela.
18. **Câmbio continua sendo digitado manualmente** — não é o PTAX do BCB nem
    dá pra vir de API de banco. Confirmado por Beatriz: hoje o valor usado é a
    cotação comercial **comparada entre Santander e Banco do Brasil**, um
    processo manual sem API disponível (nem Open Finance, nem portal do
    gerente). O PTAX (API pública do BCB, sem token, mesma fonte que
    `financeiro-gbw` já sincroniza via `pg_cron`, mas consultada aqui direto
    da API pública, sem depender do Supabase compartilhado — decisão 11)
    entra só como **referência ao lado do campo manual**, nunca sobrescreve o
    valor sozinho. A tela também mostra quando o câmbio foi ajustado pela
    última vez, com aviso se fizer mais de 24h.
19. **Cadastro de produto busca o SKU no Tiny em vez de digitar na mão**
    (aplicação da decisão 17) — busca ao vivo na API do Tiny v2
    (`produtos.pesquisa.php`, somente leitura, decisão 5), sem tabela de cache
    local: mais simples que o padrão de sincronização periódica do
    `financeiro-gbw`, ao custo de depender da API do Tiny responder na hora.
    Se ficar lenta/instável na prática, reavaliar para um cache local igual ao
    `financeiro-gbw` faz. Token (`TINY_TOKEN_RTX`) é opcional — sem ele a busca
    fica indisponível e o cadastro manual continua funcionando normalmente
    (mesmo princípio de tolerância do `vendasPainel.ts`).
20. **Produto é classificado automaticamente em rolinho/placa pelo próprio
    SKU**, sem digitar a categoria na mão. Regra herdada do `rtx-pedidos`
    (`src/routing/fornecedor.ts`): o SKU canônico do Tiny tem 14 caracteres —
    posições 3-5 são a "linha"; linha `605` é placa, qualquer outra é
    rolinho. `produtos.tipo` é calculado nesse momento (editável depois, pra
    exceção). Cada fornecedor tem um `tipo_produto_padrao` opcional (dado na
    tabela, não hardcoded — MVP_SCOPE.md já pedia "nenhum fornecedor
    hardcoded no código"); confirmado por Beatriz que hoje **Digiflex vende
    rolinho e Great vende placa** — isso é dado cadastrado, não regra fixa,
    então continua valendo se um fornecedor futuro vender os dois tipos.
    Diferente do `rtx-pedidos`, **não trouxemos a sub-separação Sunny vs.
    Digiflex dentro de placas** (lista fixa de 11 SKUs num JSON) — nesse
    sistema novo, cada fornecedor vende só um tipo; se isso deixar de ser
    verdade, a tela ainda permite corrigir manualmente o SKU cadastrado
    (o tipo sugerido nunca bloqueia o cadastro, só avisa).
    Nova tela de **Produtos** (`/produtos`) lista o catálogo com filtro por
    fornecedor — antes só dava pra ver produtos dentro da aba Compra.
21. **Plano de compra de 6 meses portado do `rtx-pedidos` para dentro deste
    módulo** — Beatriz pediu explicitamente ao ver a tela `/pedidos` em
    produção lá (revisa a decisão 16). Motor `planejar()`
    (`backend/src/engine/planoCompra.ts`) é a mesma matemática do
    `rtx-pedidos` (`src/config/pedido-necessario.ts`), copiada função por
    função com os mesmos testes de aceite ("aceite EXATO do Gustavo") — não
    foi reimplementada do zero, pra não arriscar divergir de um cálculo já
    validado em produção. Muda o parâmetro de cobertura: **`cobertura_alvo_dias`
    (30 dias) foi removida** e virou `cobertura_minima_meses` (default 2,
    igual ao `M` do rtx-pedidos) — os dois defaults antigos não eram
    equivalentes (30 dias ≈ 1 mês vs. M=2 meses de lá), então manter os
    valores de produção pareceu mais seguro que inventar um novo. Também
    entra `crescimento_mensal` (o `g` de lá, default 1.10). O antigo motor
    simples (`engine/reorder.ts`, fórmula demanda×cobertura−estoque−trânsito
    de uma linha só) foi removido — o plano de 6 meses o substitui
    completamente, inclusive pra decidir a necessidade do mês atual
    (`plan[0]`) usada em "gerar pedido".
    **Indicador Ok/Repor/Revisar por linha**: decisão de design, não cópia
    literal — no `rtx-pedidos` esse selo (verde/amber/vermelho) sinaliza
    **dado cadastral incompleto** (falta Item Code/preço/descrição), não
    urgência de compra; a urgência lá é só a cor do texto na coluna "Acaba
    Em" (vermelho ≤3 meses, amber ≤5). Beatriz pediu o indicador Ok/Repor/
    Revisar sem essa ressalva ter sido levantada na hora, então implementei
    com o significado que a UX sugere — **urgência de compra**, reaproveitando
    os mesmos limiares (≤3 revisar, ≤5 repor) que já coloriam a coluna "Acaba
    Em" — em vez do significado literal de lá (completude cadastral). Se não
    for o que Beatriz esperava, é só avisar pra ajustar.
    **Abas por tipo (Rolinhos/Placas)** substituem a escolha direta de
    fornecedor na aba Decisão de Compra — usa o `tipo_produto_padrao` da
    decisão 20 pra resolver automaticamente o fornecedor quando só um vende
    aquele tipo (caso atual); se um tipo tiver mais de um fornecedor no
    futuro, aparece um seletor dentro da aba. Fornecedores sem
    `tipo_produto_padrao` aparecem numa aba "Outros" (só existe se houver
    algum).
22. **Cadastro de produto em lote a partir do Tiny** — Beatriz apontou que
    cadastrar SKU por SKU não escala quando há muitos produtos (o catálogo de
    rolinhos tem dezenas de variações de cor/tamanho por linha). A busca do
    Tiny (decisão 19) ganhou seleção múltipla (checkbox por item + "selecionar
    todos desta página" + paginação, já que uma busca ampla pode trazer mais
    de uma página no Tiny) e um botão "Importar N selecionados", que chama
    `POST /produtos/importar-tiny`: cadastra os que ainda não existem
    (classificando o tipo pelo SKU, decisão 20) e **ignora silenciosamente os
    que já existem** em vez de falhar o lote inteiro — permite rodar a mesma
    importação de novo sem medo de duplicar ou quebrar. Produto importado em
    lote entra com custo e unid./caixa no padrão (0 e 1) — não dá pra saber
    isso a partir do Tiny; por isso a tela de Produtos (decisão 20) ganhou
    edição inline desses dois campos, pra ajustar depois sem precisar voltar
    pra aba Compra.
23. **Produto deixou de pertencer a um fornecedor — vira catálogo puro (SKU +
    tipo), sem `fornecedor_id`.** Revisão da decisão 22 e do desenho original
    do módulo: Beatriz não quer cadastrar produto dentro da aba Decisão de
    Compra (isso saiu de lá — ver ponto seguinte); o produto existe só como
    "isto é um rolinho" ou "isto é uma placa", e a escolha de **qual
    fornecedor** entra só na hora de gerar o pedido/planilha de exportação
    (`MVP_SCOPE.md`, pendente #4 — ainda não construída). Coluna
    `produtos.fornecedor_id` foi **removida** (não só ocultada — sem dado real
    em produção ainda, sem risco de perda). A Decisão de Compra continua
    funcionando igual: `calcularProposta` agora liga produto a fornecedor via
    `produtos.tipo = fornecedores.tipo_produto_padrao` (decisão 20) em vez de
    um `fornecedor_id` fixo no produto — na prática nenhuma mudança visível
    pra quem usa a tela, só destrava produto não ter mais dono fixo.
    **Cadastro de produto saiu da aba Decisão de Compra e mudou pra aba
    Produtos.** A busca/seleção múltipla do Tiny (decisão 22) foi substituída
    por **sincronizar o catálogo inteiro do Tiny de uma vez**
    (`POST /produtos/importar-tiny-catalogo`): percorre todas as páginas do
    Tiny (36 páginas ≈ 3.600 produtos no catálogo real da RTX no momento
    desta decisão), classifica cada SKU em rolinho/placa e só cadastra os
    classificáveis — o resto do catálogo do Tiny (etiquetas, outras linhas
    que não são de importação) é descartado, não é deste sistema. Produtos já
    cadastrados são ignorados (idempotente, dá pra rodar de novo). Fica
    também um cadastro manual avulso (SKU + descrição, tipo calculado
    automaticamente) pra casos pontuais sem esperar a sincronização
    completa. Pausa de 300ms entre páginas e uma tentativa extra com espera
    de 5s se o Tiny sinalizar limite de requisições (códigos 6/7) — evita que
    a sincronização inteira falhe por uma rajada.
24. **Tabela da Decisão de Compra reformulada para o layout exato do
    `rtx-pedidos`** (mesma ordem/nome de coluna: Item Code/Descrição, Width,
    Length, Quantity, CMV 30d, SKU importado, Estoque Atual, Valor Atual,
    Estoque Full, Valor Full, Em trânsito, Valor Trânsito, Acaba Em, meses) —
    pedido de Beatriz pra ficar familiar a Bruno, que já usa aquele padrão.
    Visual "planilha": fonte monoespaçada (IBM Plex Mono, igual à
    referência), grade com borda em toda célula, colunas de valor com fundo
    verde-água clara, mês atual destacado, cabeçalho fixo (sticky) ao rolar.
    O indicador Ok/Repor/Revisar (decisão 21) virou borda colorida na célula
    Item Code/Descrição em vez de coluna própria — mesmo padrão visual da
    referência (lá é um "tick" lateral, não faz parte da lista de colunas com
    nome). Adicionada barra de busca (SKU/descrição) nessa tabela e também no
    catálogo da aba Produtos.
    **Três colunas ficaram sem dado real, por ora — sinalizado, não
    inventado:**
    - **Width/Length**: ficam com "—". Não têm campo próprio no cadastro;
      o `rtx-pedidos` deriva isso de uma tabela de-para por sufixo de SKU que
      não foi trazida pra cá (decisão 20 só trouxe a classificação
      rolinho/placa, não as dimensões). Tentar adivinhar por regex na
      descrição foi descartado de propósito — um width/length errado
      mostrado como se fosse dado real é pior que "—" (Bruno pode pedir
      tamanho errado). Pendente: adicionar os campos ao cadastro (manual ou
      trazendo a tabela de-para do `rtx-pedidos`).
    - **Estoque Full / Valor Full**: ficam com "—". É estoque em centros de
      fulfillment (Mercado Livre Full + Shopee FBS) — fonte de dado que este
      sistema não lê hoje; pode ser que o `painel-gbw` já tenha isso (mesma
      fonte de onde vem a venda, decisão 15), mas não foi confirmado.
      Pendente: investigar se dá pra ler de lá.
    - **CMV 30d**: aproximado como demanda de pico mensal × custo × câmbio
      (dado que já temos), **não** é literalmente "vendas dos últimos 30
      dias" como no `rtx-pedidos` (que usa uma janela móvel real) — mais
      simples, tooltip avisa. **Quantity** foi mapeado pra "unidades por
      caixa" (dado que já temos) — não confirmado que é o mesmo conceito da
      referência (lá parece ser editável por linha, aqui não é).
25. **Data e hora ao vivo no cabeçalho do site** (atualiza a cada segundo) —
    pedido de Beatriz, visível em todas as páginas.
26. **Três gaps da decisão 24 fechados: Width/Length, custo em 3 tiers, e
    filtro de exibição da Decisão de Compra** (confirmado por Beatriz).
    - **Width/Length**: rolinho deriva do próprio SKU (`domain/dimensoes.ts`
      — 2 primeiros dígitos = length em metros, sufixo antes do "C" = width em
      centímetros; confirmado batendo com `container.json` do `rtx-pedidos`).
      Placa **não** usa `container.json` — verificado que está com width/length
      **zerado** para as 25 placas de lá, não é fonte válida. A fonte real é
      `placas-depara.json` do `rtx-pedidos` (copiado como
      `backend/src/data/placas-dimensoes.json`, 39 SKUs canônicos com
      `widthM`/`lengthM` medidos). **Limitação conhecida, não resolvida**: o
      `rtx-pedidos` tinha uma canonicalização SKU-de-venda → SKU-de-importação
      para placas (`normalize/placa.ts`, 189 pares + regras de fallback,
      cores/materiais variantes colapsando no mesmo SKU canônico) que não foi
      portada — a busca aqui é só por igualdade exata de SKU. Placa cujo SKU
      de venda não bate exatamente com uma chave de `placas-dimensoes.json`
      fica sem dimensão (null, nunca inventada). Se isso se mostrar comum na
      prática, portar a canonicalização completa é o próximo passo.
    - **Custo em 3 tiers**: recuperada a lógica do `rtx-pedidos`
      (`repo/custos.ts` + `scripts/gen-custos.ts`) em vez do `custo_unit_usd`
      único manual. `backend/src/data/custos.json` (cópia do gerado lá,
      4300+ linhas) + `backend/src/repo/custos.ts` (leitor) +
      `backend/src/domain/custos.ts` (`custoUnitario(sku, tipo, tier)`, com
      derivação por dimensão de placa quando não há custo direto no SKU).
      `PropostaItem` ganhou `custoAtualUsd`/`custoTransitoUsd` — usados pela
      tela pra "Valor Atual"/"Valor Trânsito" (substituindo o cálculo com
      `custoUnitUsd` fixo); caem de volta pro `custo_unit_usd` manual do
      produto quando o SKU não está na tabela de referência. **Não portado**:
      o script `gen-custos.ts` em si (lê 3 planilhas Excel com caminho
      hardcoded no `Downloads` do Gustavo) — regenerar `custos.json` com
      planilha nova ainda depende de rodar aquele script no `rtx-pedidos` e
      copiar o resultado aqui; portar o gerador fica pra quando isso virar
      necessidade recorrente. Nota: `custo_unit_usd` (manual) continua sendo
      o preço usado pra **precificar pedido novo** (`custoUsd`/`custoBrl`,
      `POST /proposta/gerar-pedido`) — os 3 tiers só valorizam estoque já
      existente, não o que está sendo comprado agora (mesma separação do
      `rtx-pedidos`: `custos.json` valoriza posição, `container.json.priceSqm`
      precifica compra — o `priceSqm` não foi portado, fica pro gerador de
      Excel do pedido quando o formato for confirmado).
    - **Filtro de exibição**: `GET /proposta` só devolve item quando
      `precisaAtencao()` (`domain/proposta.ts`) é verdadeiro — necessidade
      automática do mês > 0 (`plan[0]`, que já embute cobertura mínima + lead
      time + crescimento) **OU** estoque físico atual cobre menos dias de
      venda que `estoqueCriticoDias` (novo parâmetro, default 60 dias — mesmo
      piso já usado na tela espelho `RtxPedidos.jsx`, editável em "Parâmetros
      do cálculo"). `calcularProposta` continua devolvendo **todos** os
      produtos do fornecedor (não filtrado) — o filtro é só da rota GET, pra
      não impedir `gerar-pedido` de usar override num SKU fora da lista
      visível. Decisão de design: os dois critérios se combinam por OU, não
      só `plan[0]>0` sozinho — protege contra o caso do Full/trânsito
      mascararem um problema real no galpão que o plano ainda não capturou.
27. **Fornecedor pode vender mais de um tipo de produto; tipos de produto
    viram cadastro dinâmico** (confirmado por Beatriz: "cadastro dinâmico
    completo"). Antes: `tipo` de produto e `tipo_produto_padrao` de fornecedor
    eram um `CHECK` fixo em `('rolinho', 'placa')`. Agora: tabela
    `tipos_produto` (nome como chave, seed com os 2 valores atuais) — nova
    tela/seção em Fornecedores pra cadastrar tipos novos (`POST
    /tipos-produto`), sem exigir migração de código pra cada tipo. Fornecedor
    ganhou tabela N:N `fornecedor_tipos_produto` (substituiu a coluna única
    `tipo_produto_padrao`) — no cadastro agora é uma lista de checkboxes, uma
    por tipo cadastrado. `classificarTipoPorSku` (auto-classificação pelo
    SKU) **continua só cobrindo rolinho/placa** — um tipo novo cadastrado não
    tem regra de SKU, precisa ser atribuído a mão no produto; isso é aceito
    de propósito (Width/Length e custo por dimensão de placa também só têm
    fórmula pra esses dois, mesma limitação). `calcularProposta`
    (`domain/proposta.ts`) juntava produto↔fornecedor por
    `fornecedores.tipo_produto_padrao = produtos.tipo`; agora junta via
    `fornecedor_tipos_produto` (`JOIN ... WHERE ftp.fornecedor_id = X`) — um
    fornecedor com 2 tipos vê produtos dos 2. Decisão de Compra
    (`CompraPage.tsx`) trocou as abas fixas Rolinhos/Placas por abas
    dinâmicas (uma por `tipos_produto` cadastrado) + "Outros" pra fornecedor
    sem tipo nenhum.
28. **Estoque puxado do Tiny na sincronização do catálogo, mas continua
    editável na tela** (confirmado por Beatriz — não virou fonte única/
    automática, ao contrário do que a decisão 17 cogitava resolver de vez).
    `POST /produtos/importar-tiny-catalogo` agora também chama
    `produto.obter.estoque.php` (Tiny API v2, mesma regra do `rtx-pedidos`:
    soma saldo dos depósitos com `desconsiderar != 'S'`) pra cada produto
    classificado (novo ou já existente) e faz upsert na tabela `estoque` —
    melhor esforço por SKU (uma falha isolada não derruba a sincronização
    inteira). Aba Produtos ganhou coluna Estoque, editável inline (mesmo
    padrão de Custo) — a próxima sincronização sobrescreve o valor de novo,
    então uma correção manual pontual não é permanente se o Tiny divergir.
    `GET /produtos` passou a fazer LEFT JOIN com `estoque` pra trazer esse
    valor junto (campo `estoque`, 0 quando o SKU nunca teve linha lá).
29. **Custo unitário (`custo_unit_usd`) passa a ser preenchido automaticamente
    a partir da tabela de custos já portada (`custos.json`, decisão 26) em vez
    de ficar sempre em 0 até alguém digitar** — confirmado por Beatriz: "terei
    uma tabela de custos atualizada logo menos, então use a custos.json por
    agora" (ou seja, essa fonte pode mudar quando a planilha nova chegar; o
    mecanismo de backfill continua igual, só troca o arquivo). Dois pontos de
    preenchimento: (1) produto novo importado do Tiny já nasce com o custo do
    tier "atual" quando o SKU bate na tabela; (2) a cada sincronização, todo
    produto com `custo_unit_usd = 0` e tipo classificado tenta de novo (cobre
    produtos importados antes desse mecanismo existir, e o caso de custos.json
    ser atualizado depois). Nunca sobrescreve um custo já diferente de 0 —
    respeita ajuste manual ou um custo já preenchido antes.
30. **Width/Length de placa em kit ("Kit de 5"/"Kit de 8") recuperado via
    match de sufixo, investigado a pedido de Beatriz (TODO "width e length das
    placas vazio")** — das 268 placas ativas, 229 ficavam sem dimensão porque
    a maioria usa um SKU de kit em que os 2 primeiros dígitos são a
    QUANTIDADE do kit (ex. `05605PTJBRA38C` = kit de 5), não a largura em cm
    como nos SKUs de peça avulsa que a tabela `placas-dimensoes.json`
    (decisão 26) cobre. Como o restante do SKU do kit (posição 2 em diante) é
    idêntico ao da peça avulsa correspondente — mesmo material físico, só
    embalado diferente — `dimensaoPlaca` (`domain/dimensoes.ts`) agora também
    tenta casar por esse sufixo antes de desistir; recupera 64 dos 229. **Não**
    voltamos a tentar extrair medida por regex da descrição (recuperaria mais
    ~68) — a decisão 24 já tinha avaliado e descartado essa abordagem de
    propósito, e nada mudou nesse racional. Os ~165 sem par avulso na tabela
    continuam "—". Achado colateral da mesma investigação: 3 SKUs de linha
    "415" (`01415ESCMFELTR`, `01415ESDEFELTR`, `01415ESPRIGIDA` — espátulas de
    aplicação, não rolo) estão classificados como "rolinho" só porque
    `classificarTipoPorSku` trata qualquer linha ≠ "605" como rolinho; não
    quebra nada hoje (Width/Length já ficava null pra eles, o padrão de SKU não
    bate), mas é classificação errada — registrado como pendência de decisão
    de negócio (criar tipo "acessório"? excluir da Decisão de Compra? ver
    TODO.md), não uma correção de código sozinha porque envolve decidir se
    esses itens devem aparecer na grade de compra.
31. **Variações de tamanho do mesmo produto mescladas visualmente na grade da
    Decisão de Compra** (`GradePrincipal.tsx`), a pedido de Beatriz —
    consultado `rtx-pedidos` (`src/api/pages.ts`) como referência de como
    fazer. Lá o padrão é: chave de grupo = NCM + Item Code + Descrição;
    linhas consecutivas do mesmo grupo mesclam a célula Item/Descrição via
    `rowspan` (só a primeira linha do grupo emite a célula). Trazido pra cá
    do mesmo jeito, com um ajuste necessário: a ordenação da grade agora é
    NCM → Item Code → Width → Length (antes era só por NCM, com a ordem de
    SKU vindo do banco) — sem isso as variações de um mesmo produto não
    ficam adjacentes, porque os 2 primeiros dígitos do SKU são o
    comprimento (não o produto), então SKUs do mesmo Item Code se espalham
    pela tabela inteira quando ordenados como string.

## Pendentes — nenhuma suposição foi feita, precisa de confirmação

1. **Projeto Railway de staging ainda não criado.** O repositório GitHub já
   existe (`rtx-imports/rtx-estoque-importacao`), mas esta sessão não tem
   credencial do Railway configurada — consistente com a prática de rotear
   trabalho de infraestrutura/credenciais para uma sessão dedicada. Não vou
   tentar criar o ambiente Railway a partir daqui.
2. **Mecanismo de integração com financeiro-gbw** (era PENDENTE #4) — segue
   adiado para a fase de Pagamento, com uma ressalva nova: quando essa fase
   chegar, apresentar duas opções lado a lado antes de implementar, sem
   decidir de antemão: (a) nova Edge Function em `financeiro-gbw` seguindo o
   padrão `nfe-emitir`, ou (b) endpoint HTTP simples fora do Supabase que
   `financeiro-gbw` consulta/chama — avaliando se vale continuar aprofundando
   dependência de Edge Function do Supabase (ver decisão 11) ou não. Só
   relevante a partir da fase de Pagamento (fora do MVP).
3. **ClickUp — migrar, integrar (leitura via API) ou paralelo?** Confirmado
   que segue adiado para quando os módulos de fase (pagamento em diante)
   começarem — não usar o scaffold de integração com ClickUp do `rtx-pedidos`
   sem revisão (nunca foi confirmado funcionando).
4. **Formato exato da planilha de exportação do pedido — pista forte
   encontrada, falta confirmar.** Os dois arquivos enviados
   (`DO260623318_pedido inicial rolos.xlsx`, `PI 26283_Pedido inicial_placas.xlsx`)
   são as proforma invoices que os fornecedores retornam, não o formato de
   envio da RTX. O `rtx-pedidos` já gera uma planilha `.xlsx` no layout da aba
   "Container" que a empresa usa hoje para mandar pedido ao fornecedor —
   provavelmente é essa a resposta, mas precisa de confirmação de Beatriz
   antes de assumir como definitivo.
5. **Usuários e permissões por fase** (importação, financeiro, estoque, RH) —
   quem serão e quais níveis de acesso, a partir do módulo de Pagamento em
   diante. Nem `financeiro-gbw` nem `painel-gbw` têm hoje controle de
   permissão por usuário — não há um padrão existente para copiar; será
   construído do zero. Depende de Beatriz.
6. ~~Escopo exato do módulo de decisão de compra~~ — resolvido pelas decisões
   15 e 16 abaixo. Continua em aberto só o desenho técnico (schema, camadas),
   que é o próximo passo.

## O que ainda depende de Beatriz e não deve ser assumido

- Formato final da planilha de pedido (enviar em separado).
- Quem serão os usuários/perfis a partir do módulo de Pagamento.
- Decisão sobre servidor próprio vs. cloud gerenciada para a empresa como um
  todo — está em avaliação, não afeta o MVP deste sistema.

## Observação sobre o material já recebido

O texto "Plano sistema COMEX FINANCEIRO.txt" e as duas planilhas de proforma
(dentro de `material de apoio para o sistema estoque-importação/`) já
respondem, na prática, boa parte do que a seção 5 do prompt original listava
como "perguntas em aberto" sobre o processo em si — o que restou pendente
acima é mais sobre infraestrutura, integração técnica e formato exato de
saída, não sobre o processo de negócio, que já está bem descrito.
