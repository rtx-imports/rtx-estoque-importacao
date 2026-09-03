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

Calcula a necessidade de compra por produto (demanda × cobertura − estoque − trânsito).
Venda é lida do banco do painel-gbw — configure `PAINEL_DATABASE_URL` em `backend/.env`
para ativar (sem essa variável, a demanda fica em 0 em vez de quebrar, útil pra dev sem
credencial). `LEAD_TIME_DIAS`, `COBERTURA_ALVO_DIAS`, `CAMBIO` e `JANELA_MESES` têm
defaults sensatos e podem ser sobrescritos pela tela de Parâmetros ou pelo `.env` — ver
`backend/.env.example`.
