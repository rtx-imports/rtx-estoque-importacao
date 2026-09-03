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
