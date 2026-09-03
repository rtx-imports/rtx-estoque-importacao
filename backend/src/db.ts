import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada");
}

export const sql = postgres(connectionString, {
  onnotice: () => {},
  types: {
    // numeric (OID 1700) volta como string por padrão no postgres.js, para não
    // perder precisão — os valores deste sistema (preço, quantidade) não
    // exigem precisão arbitrária, então convertemos para number por
    // conveniência no consumo da API.
    numeric: {
      to: 1700,
      from: [1700],
      serialize: (x: number) => String(x),
      parse: (x: string) => Number(x),
    },
  },
});
