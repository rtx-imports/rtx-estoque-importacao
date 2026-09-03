import Fastify from "fastify";
import { fornecedoresRoutes } from "./routes/fornecedores.js";

export function buildApp() {
  const app = Fastify({ logger: !process.env.VITEST });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(fornecedoresRoutes);

  return app;
}
