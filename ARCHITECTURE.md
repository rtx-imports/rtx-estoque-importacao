# ARCHITECTURE.md — RTX Imports · Sistema de Gestão de Importação

> Rascunho para revisão. Repositório GitHub criado
> (`rtx-imports/rtx-estoque-importacao`); nenhum código nem ambiente
> Railway/Supabase foi criado ainda. Este documento propõe uma arquitetura;
> os pontos antes marcados **[PENDENTE]** já decididos (banco, driver de
> acesso, autenticação do MVP, `.github` da org) foram confirmados — ver
> DECISIONS.md. Os poucos itens que restam pendentes seguem marcados.
>
> **Princípio de longo prazo confirmado**: este projeto é também um piloto de
> "vida fora do Supabase" — não deve aumentar a dependência do projeto
> Supabase compartilhado por `financeiro-gbw`/`painel-gbw`, que já ultrapassou
> US$400/mês de custo. Isso não implica migrar esses dois sistemas (avaliação
> separada, em aberto); implica que toda decisão futura deste projeto
> (storage, auth, filas, etc.) deve preferir opções que funcionem tanto em
> VPS/servidor próprio quanto em Railway.

## 1. Contexto e restrições de partida

- Repositório novo, separado de `financeiro-gbw` e de `rtx-pedidos` (legado,
  não tocar). Nenhum dos dois é a base de código deste projeto.
- Ambiente de teste isolado: sem credencial ou banco de produção compartilhado
  no MVP.
- Não usar SDK proprietário de infraestrutura (evitar lock-in ao trocar de
  provedor no futuro).
- MVP = módulo de **Pedido** apenas (ver MVP_SCOPE.md). Nada de pagamento,
  produção, desembaraço, conferência ou contabilidade nesta fase.

## 2. O que já existe no grupo (constatado, não suposto)

Levantamento feito lendo `financeiro-gbw`, `painel-gbw`/`painel-gbwv2` e o
legado `rtx-pedidos` (todos como referência de leitura, não como base):

| Sistema | Stack | Banco | Auth | Observação |
|---|---|---|---|---|
| `financeiro-gbw` | React+Vite, Supabase Edge Functions (Deno) | Supabase/Postgres (projeto `ylbszminytbmnwkknixy`) | Supabase Auth, mas **um único login compartilhado** da equipe, sem papéis por usuário | Compartilha o **mesmo** projeto Supabase com `painel-gbw` |
| `painel-gbw` (absorveu `painel-gbwv2`) | Node/Express + 2 SPAs React (Vite) | Supabase/Postgres (mesmo projeto acima) + uso direto de `pg` em alguns scripts | Senha única em cookie, sem usuário individual | Hospedado no Railway via Nixpacks |
| `rtx-pedidos` (legado) | Fastify + Postgres/Supabase | Supabase/Postgres próprio | — | Não é um sistema de pedido completo — é uma calculadora de reposição de estoque; ver DECISIONS.md e a nota na seção 5 |

Nenhum dos dois sistemas em produção usa driver Postgres puro — ambos usam
`@supabase/supabase-js`. A regra "não usar SDK proprietário" (seção 0) diverge
do padrão atual do grupo — **confirmado como intencional** (ver decisão 8 em
DECISIONS.md): este sistema não usa Supabase no MVP, logo não há SDK
proprietário a evitar.

Não existe, em nenhum dos repositórios do grupo, tabela de comprovante/anexo
nem uso de Supabase Storage (nem qualquer bucket de arquivos). Este sistema
seria o primeiro a resolver isso — não há um padrão pronto para copiar.

Não existia repositório `.github` central da organização nem
`padroes-github.md` em nenhum dos quatro repositórios inspecionados
(`financeiro-gbw`, `painel-gbw`, `painel-gbwv2`, `devolucoes-gbw`). A seção 0
do prompt original presumia que esse padrão já existisse — **decisão
confirmada**: criar `rtx-imports/.github` agora, como parte do bootstrap
deste projeto, usando exatamente o pacote de templates já pronto
(CONTRIBUTING.md, COMMIT_CONVENTION.md, PULL_REQUEST_TEMPLATE.md,
ISSUE_TEMPLATE/, CODE_OF_CONDUCT.md, profile/README.md, .gitmessage) — ver
decisão 10 em DECISIONS.md.

## 3. Proposta de arquitetura para o MVP

### 3.1 Frontend
React + Vite + TypeScript. Reaproveitar as escolhas visuais de `painel-gbw`
(Tailwind, Radix UI, TanStack Table/Query, lucide-react) por consistência
visual com o resto do grupo — como um novo pacote, sem importar código do
`painel-gbw` diretamente.

### 3.2 Backend
API Node.js pequena (Fastify, seguindo o padrão já usado no `rtx-pedidos`
legado, que funcionou bem como limite de sistema — ver nota "Tiny é somente
leitura" na seção 5). Acesso a banco via driver Postgres padrão (`postgres.js`
ou `pg`), **não** via SDK do Supabase — cumprindo a regra 0 mesmo divergindo
do padrão atual do grupo.

### 3.3 Banco de dados
Postgres. **Confirmado** (decisão 7 em DECISIONS.md): **não** usar um projeto
Supabase para o MVP — usar o add-on de Postgres padrão do próprio Railway no
ambiente de staging. Isso:
- resolve a regra "ambiente de teste isolado, sem banco de produção" de forma
  literal (banco novo, zero superfície compartilhada com `financeiro-gbw`/
  `painel-gbw`);
- não contribui em nada para o custo do projeto Supabase compartilhado, que
  já ultrapassou US$400/mês;
- resolve a tensão do SDK do Supabase por completo (não há SDK a evitar se
  não há Supabase envolvido);
- é reversível — se mais adiante fizer sentido migrar para um projeto Supabase
  dedicado (ex.: para reaproveitar Auth ou Storage), a troca é só de driver de
  conexão, já que o acesso é via Postgres padrão desde o início.

### 3.4 Armazenamento de anexos (invoice proforma no MVP)
Nenhum padrão herdado do grupo. Proposta: storage compatível com S3 (bucket
dedicado, acessado via SDK S3 padrão — não proprietário) em vez de Supabase
Storage, pelo mesmo motivo do banco.

### 3.5 Autenticação (MVP)
Nem `financeiro-gbw` nem `painel-gbw` têm hoje controle de permissão por
usuário/papel — os dois usam login único compartilhado. Este sistema
eventualmente precisa de responsável por fase e permissões diferenciadas
(RH não vê financeiro, por exemplo — seção 5 do prompt original), mas isso é
capacidade nova a construir, não algo a copiar do grupo. Para o MVP (só
módulo de Pedido, uso interno de importação), proposta mínima: login com
usuário/senha próprio (tabela de usuários simples), sem RBAC completo ainda —
RBAC entra quando os módulos de fase (pagamento, RH, etc.) começarem, quando
os perfis de usuário ficarem claros. **Confirmado** (decisão 9 em
DECISIONS.md).

### 3.6 Integração com financeiro-gbw
Não existe hoje uma superfície de integração genérica em `financeiro-gbw` —
o padrão mais próximo é uma Supabase Edge Function invocada por POST com
service-role key (ex.: `nfe-emitir`). Para o MVP: nenhuma integração ainda é
necessária (MVP é só Pedido — comprovantes e NFs só entram nas fases
seguintes). **[PENDENTE]** (era #4) — quando a fase de Pagamento chegar,
apresentar duas opções lado a lado antes de implementar, sem decidir de
antemão: (a) nova Edge Function em `financeiro-gbw` seguindo o padrão de
`nfe-emitir`, mantendo os dois bancos desacoplados; ou (b) endpoint HTTP
simples fora do Supabase que `financeiro-gbw` consulta/chama — avaliando à
época se vale aprofundar a dependência de Edge Function do Supabase (ver
princípio de longo prazo na seção 0) ou não.

### 3.7 ClickUp
Nenhuma integração no MVP (módulo de Pedido não depende do board). O legado
`rtx-pedidos` tentou uma integração de leitura via API do ClickUp para
espelhar status de embarque e deixou isso como scaffold nunca confirmado
funcionando de fato — não é um caminho testado, não deve ser copiado sem
revisão. Decisão de migrar/integrar/paralelo fica para quando os módulos de
fase (pagamento em diante) começarem. **[PENDENTE]** (era #6).

### 3.8 Tiny ERP
Fora do escopo do MVP (Pedido não toca estoque). Quando entrar (fase de
conferência/entrada em estoque), manter a mesma regra que funcionou bem no
`rtx-pedidos` legado: **Tiny é somente leitura**, nunca escrito por este
sistema.

## 4. O que este desenho deixa em aberto de propósito

- **Fases futuras já têm um lugar reservado no schema** (ver DATA_MODEL.md —
  `pedido_documentos.fase` e `pedido_fase_status.fase`), mesmo que o MVP só
  popule a fase `pedido`. Isso evita redesenhar o schema quando pagamento,
  produção, desembaraço etc. entrarem.
- **Itens de pedido usam um campo de atributos extensível** (`atributos_extra`)
  porque os dois fornecedores atuais têm formatos de invoice completamente
  diferentes entre si (ver DATA_MODEL.md) — modelar campo a campo fixo
  quebraria no primeiro fornecedor novo.
- **Bipagem e localização por galpão não entram no MVP**, mas nada no desenho
  do módulo de Pedido impede que a tabela de itens ganhe, mais tarde, um
  vínculo com localização física — isso é responsabilidade do módulo de
  Conferência, não do de Pedido.
