import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { fornecedoresRoutes } from "./routes/fornecedores.js";
import { pedidoDocumentosRoutes } from "./routes/pedidoDocumentos.js";
import { pedidosRoutes } from "./routes/pedidos.js";

export function buildApp() {
  const app = Fastify({ logger: !process.env.VITEST });

  app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(fornecedoresRoutes);
  app.register(pedidosRoutes);
  app.register(pedidoDocumentosRoutes);

  return app;
}
