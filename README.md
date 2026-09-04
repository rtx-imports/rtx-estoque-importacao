# rtx-estoque-importacao

Sistema de Gestão de Importação — RTX Imports. Ver ARCHITECTURE.md,
DATA_MODEL.md, DECISIONS.md e MVP_SCOPE.md para contexto completo.

## Rodando localmente

Pré-requisitos: Node 20+, Docker.

```bash
npm install
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test

npm run db:up             # sobe Postgres local via Docker Compose
npm run migrate:up        # aplica o schema no banco de dev
npm run migrate:test:up   # aplica o schema no banco de testes

npm run dev            # backend em http://localhost:3333
npm run dev:frontend   # frontend em http://localhost:5173
npm test               # roda a suíte de testes — usa um banco separado, não mexe no de dev
```

**Importante:** `backend/.env` (dev) e `backend/.env.test` (testes) apontam para bancos
Postgres **diferentes** (`rtx_estoque_importacao` vs. `rtx_estoque_importacao_test`) de
propósito — os testes fazem `TRUNCATE` nas tabelas a cada execução, e usar o mesmo banco
do dev já apagou dados reais cadastrados manualmente uma vez. Nunca aponte os dois para
o mesmo banco.

`npm run db:down` derruba o Postgres local quando não precisar mais dele.

## Módulo de decisão de compra

Calcula, por produto, um plano de compra dos próximos 7 meses (mês atual + 6) — motor
`planejar()` (`backend/src/engine/planoCompra.ts`), portado do `rtx-pedidos` já validado em
produção (DECISIONS.md, decisão 21). Venda é lida do banco do painel-gbw — configure
`PAINEL_DATABASE_URL` em `backend/.env` para ativar (sem essa variável, a demanda fica em 0
em vez de quebrar, útil pra dev sem credencial). `LEAD_TIME_DIAS`, `COBERTURA_MINIMA_MESES`,
`CRESCIMENTO_MENSAL`, `CAMBIO` e `JANELA_MESES` têm defaults sensatos (iguais aos do
`rtx-pedidos`) e podem ser sobrescritos pela tela de Parâmetros ou pelo `.env` — ver
`backend/.env.example`. O câmbio continua manual (cotação comparada entre Santander e
Banco do Brasil — DECISIONS.md, decisão 18); a tela mostra o PTAX do BCB só como
referência ao lado, buscado ao vivo da API pública do Banco Central.

Produto não pertence a um fornecedor fixo — é catálogo puro (SKU + tipo rolinho/placa,
classificado automaticamente pelo SKU do Tiny), e o fornecedor entra só na hora de gerar o
pedido, resolvido por `tipo_produto_padrao` de cada fornecedor (DECISIONS.md, decisões 20 e
23). Cadastro de produto fica na aba **Produtos**, não na Decisão de Compra, em dois passos
separados (cada um curto — segundos a poucas dezenas de segundos, nunca uma única chamada
gigante): "1. Importar catálogo" cadastra os produtos classificáveis em rolinho/placa +
guarda o id de cada um no Tiny (`tiny_id`); "2. Sincronizar estoque" puxa a quantidade em
lotes, com barra de progresso, retomável se interromper. Além do botão manual, com
`TINY_TOKEN_RTX` configurado um job em background (`src/jobs/estoqueAutosync.ts`) sincroniza
sozinho um pouco de estoque a cada 5 min (sempre os produtos mais desatualizados primeiro) —
nunca processa o catálogo inteiro de uma vez, então não bate no rate limit do Tiny numa
rajada; desligar com `DISABLE_ESTOQUE_AUTOSYNC=1`. Sem `TINY_TOKEN_RTX`, toda a sincronização
fica indisponível e o cadastro manual continua funcionando (DECISIONS.md, decisão 19). Cada
empresa do grupo (RTX, BG, BW, BRA) tem sua própria conta/estoque no Tiny — não
compartilham; este sistema lê só a conta RTX (o estoque físico de importação, que é o que
importa pra decisão de compra).
