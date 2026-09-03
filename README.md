# rtx-estoque-importacao

Sistema de Gestão de Importação — RTX Imports. Ver ARCHITECTURE.md,
DATA_MODEL.md, DECISIONS.md e MVP_SCOPE.md para contexto completo.

## Rodando localmente (backend)

Pré-requisitos: Node 20+, Docker.

```bash
npm install
cp backend/.env.example backend/.env

npm run db:up        # sobe Postgres local via Docker Compose
npm run migrate:up    # aplica o schema

npm run dev           # API em http://localhost:3333
npm test               # roda a suíte de testes contra o Postgres local
```

`npm run db:down` derruba o Postgres local quando não precisar mais dele.
