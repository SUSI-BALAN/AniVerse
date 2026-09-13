import { Router } from "express";
import { z } from "zod";
import { ProviderManager } from "../providers/providerManager.js";

const resolveSchema = z.object({
  providerId: z.string().min(1).max(40),
  anilistId: z.number().int().nullable().optional(),
  malId: z.number().int().nullable().optional(),
  episode: z.number().int().max(10000),
  language: z.enum(["sub", "dub"])
});

export function createProvidersRouter(manager = new ProviderManager()) {
  const router = Router();
  router.get("/", (_request, response) => response.json({ success: true, data: manager.list() }));
  router.get("/:providerId", (request, response) => { const provider = manager.get(request.params.providerId); return response.json({ success: true, data: { id: provider.id, label: provider.label, enabled: provider.enabled, status: provider.getStatus(), capabilities: provider.getCapabilities(), allowedOrigins: provider.getAllowedOrigins() } }); });
  router.post("/resolve", (request, response) => { const input = resolveSchema.parse(request.body); const { providerId, ...providerInput } = input; return response.json({ success: true, data: manager.resolve(providerId, providerInput) }); });
  return router;
}
