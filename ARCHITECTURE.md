# ARCHITECTURE.md — RTX Imports · Sistema de Gestão de Importação

> Rascunho para revisão. Nada aqui foi implementado ainda — nenhum código, nenhum
> repositório GitHub, nenhum ambiente Railway/Supabase foi criado. Este documento
> propõe uma arquitetura e assume uma posição em cada ponto, mas os itens marcados
> como **[PENDENTE]** dependem de confirmação (ver DECISIONS.md).

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
`@supabase/supabase-js`. Isso importa porque a regra "não usar SDK
proprietário" (seção 0) diverge do padrão atual do grupo — ver
**[PENDENTE #2]** em DECISIONS.md.

Não existe, em nenhum dos repositórios do grupo, tabela de comprovante/anexo
nem uso de Supabase Storage (nem qualquer bucket de arquivos). Este sistema
seria o primeiro a resolver isso — não há um padrão pronto para copiar.

Não existe repositório `.github` central da organização nem `padroes-github.md`
em nenhum dos quatro repositórios inspecionados (`financeiro-gbw`, `painel-gbw`,
`painel-gbwv2`, `devolucoes-gbw`). A seção 0 do prompt original presume que
esse padrão já existe — não encontrei evidência disso. Ver **[PENDENTE #5]**.

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
Postgres. Proposta: **não** usar um projeto Supabase para o MVP — usar o
add-on de Postgres padrão do próprio Railway no ambiente de staging. Isso:
- resolve a regra "ambiente de teste isolado, sem banco de produção" de forma
  literal (banco novo, zero superfície compartilhada com `financeiro-gbw`/
  `painel-gbw`);
- resolve a tensão do SDK do Supabase por completo (não há SDK a evitar se
  não há Supabase envolvido);
- é reversível — se mais adiante fizer sentido migrar para um projeto Supabase
  dedicado (ex.: para reaproveitar Auth ou Storage), a troca é só de driver de
  conexão, já que o acesso é via Postgres padrão desde o início.

**[PENDENTE #3]** — confirmar se isso é aceitável ou se a preferência é já
nascer em um projeto Supabase (novo e isolado do de produção).

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
os perfis de usuário ficarem claros. **[PENDENTE #8]**.

### 3.6 Integração com financeiro-gbw
Não existe hoje uma superfície de integração genérica em `financeiro-gbw` —
o padrão mais próximo é uma Supabase Edge Function invocada por POST com
service-role key (ex.: `nfe-emitir`). Proposta para o MVP: nenhuma integração
ainda é necessária (MVP é só Pedido — comprovantes e NFs só entram nas fases
seguintes). Quando a fase de pagamento inicial for implementada, propor uma
nova Edge Function em `financeiro-gbw` (seguindo o padrão de `nfe-emitir`)
como ponto de entrada, mantendo os dois bancos desacoplados — em vez de
escrever diretamente nas tabelas do Postgres de `financeiro-gbw`.
**[PENDENTE #4]** — confirmar esse caminho antes daquela fase.

### 3.7 ClickUp
Nenhuma integração no MVP (módulo de Pedido não depende do board). O legado
`rtx-pedidos` tentou uma integração de leitura via API do ClickUp para
espelhar status de embarque e deixou isso como scaffold nunca confirmado
funcionando de fato — não é um caminho testado, não deve ser copiado sem
revisão. Decisão de migrar/integrar/paralelo fica para quando os módulos de
fase (pagamento em diante) começarem. **[PENDENTE #6]**.

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
