import Fastify from "fastify";
import { fornecedoresRoutes } from "./routes/fornecedores.js";
import { pedidosRoutes } from "./routes/pedidos.js";

export function buildApp() {
  const app = Fastify({ logger: !process.env.VITEST });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(fornecedoresRoutes);
  app.register(pedidosRoutes);

  return app;
}
