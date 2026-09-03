-- Banco separado para a suíte de testes (backend/test/setup.ts usa
-- backend/.env.test) — nunca deve ser o mesmo banco do ambiente de
-- desenvolvimento, porque os testes fazem TRUNCATE nas tabelas.
CREATE DATABASE rtx_estoque_importacao_test;
