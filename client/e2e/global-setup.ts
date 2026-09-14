import type { FullConfig } from "@playwright/test";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { recommendationCatalog } from './recommendation-catalog';

export default async function globalSetup(_config: FullConfig) {
  process.env.NODE_ENV="test";
  process.env.DATABASE_MODE="sqlite";
  process.env.AUTH_MODE="local";
  process.env.VITE_AUTH_MODE="local";
  process.env.VITE_API_BASE_URL="";
  process.env.DATABASE_PATH = "../server/data/aniverse.e2e.db";
  process.env.PORT = "4174";
  process.env.CLIENT_ORIGIN = "http://127.0.0.1:4173";
  process.env.VITE_PROXY_TARGET = "http://127.0.0.1:4174";
  const [{ initializeDatabase }, { createApp }] = await Promise.all([import("../../server/src/database/connection.ts"), import("../../server/src/app.ts")]);
  initializeDatabase();
  const api: Server = createApp({ animeService: recommendationCatalog as never }).listen(4174, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { api.once("listening", resolve); api.once("error", reject); });
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite: ViteDevServer = await createViteServer({ root, server: { host: "127.0.0.1", port: 4173, strictPort: true } });
  await vite.listen();
  return async () => { await vite.close(); await new Promise<void>((resolve) => api.close(() => resolve())); };
}
