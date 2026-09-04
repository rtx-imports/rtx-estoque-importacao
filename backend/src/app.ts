import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { estoqueRoutes } from "./routes/estoque.js";
import { fornecedoresRoutes } from "./routes/fornecedores.js";
import { parametrosRoutes } from "./routes/parametros.js";
import { pedidoChecklistRoutes } from "./routes/pedidoChecklist.js";
import { pedidoDocumentosRoutes } from "./routes/pedidoDocumentos.js";
import { pedidosRoutes } from "./routes/pedidos.js";
import { produtosRoutes } from "./routes/produtos.js";
import { propostaRoutes } from "./routes/proposta.js";
import { tinyRoutes } from "./routes/tiny.js";
import { tiposProdutoRoutes } from "./routes/tiposProduto.js";

export function buildApp() {
  const app = Fastify({ logger: !process.env.VITEST });

  app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(fornecedoresRoutes);
  app.register(pedidosRoutes);
  app.register(pedidoDocumentosRoutes);
  app.register(pedidoChecklistRoutes);
  app.register(produtosRoutes);
  app.register(estoqueRoutes);
  app.register(parametrosRoutes);
  app.register(propostaRoutes);
  app.register(tinyRoutes);
  app.register(tiposProdutoRoutes);

  return app;
}
