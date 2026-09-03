import dotenv from "dotenv";

/**
 * Os testes usam um banco separado (.env.test) do usado por `npm run dev` —
 * cada teste faz TRUNCATE nas tabelas, e isso já apagou dados reais
 * cadastrados manualmente quando os dois bancos eram o mesmo. Nunca aponte
 * .env.test para o mesmo banco de .env.
 */
dotenv.config({ path: ".env.test", override: true });
