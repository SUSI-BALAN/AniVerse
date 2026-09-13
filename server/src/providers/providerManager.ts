import { AppError } from "../utils/appError.js";
import { PROVIDER_PRIORITY } from "./provider.config.js";
import { createProviderRegistry } from "./providerRegistry.js";
import type { AnimeProvider, ProviderId, ProviderInput } from "./provider.types.js";
import { assertValidProviderInput } from "./provider.utils.js";

export class ProviderManager {
  constructor(private readonly providers: Map<ProviderId, AnimeProvider> = createProviderRegistry()) {}
  register(provider: AnimeProvider) { this.providers.set(provider.id, provider); }
  get(providerId: string): AnimeProvider { const provider = this.providers.get(providerId as ProviderId); if (!provider) throw new AppError(404, "PROVIDER_NOT_FOUND", "That playback server does not exist."); return provider; }
  list() { return PROVIDER_PRIORITY.map((id) => this.providers.get(id)).filter((provider): provider is AnimeProvider => Boolean(provider)).map((provider) => ({ id: provider.id, label: provider.label, enabled: provider.enabled, status: provider.getStatus(), capabilities: provider.getCapabilities(), allowedOrigins: provider.getAllowedOrigins() })); }
  resolve(providerId: string, input: ProviderInput) { const provider = this.get(providerId); if (!provider.enabled) throw new AppError(503, "PROVIDER_DISABLED", "This playback server is disabled."); if (provider.getStatus() === "MISCONFIGURED") throw new AppError(503, "PROVIDER_MISCONFIGURED", "This playback server is not configured."); const validation = provider.validateInput(input); assertValidProviderInput(validation); if (!provider.canHandle(input)) throw new AppError(422, "PROVIDER_UNSUPPORTED_ANIME", "This server is unavailable for this anime."); const embedUrl = provider.getEmbedUrl(input); if (!embedUrl) throw new AppError(503, "PROVIDER_UNAVAILABLE", "This playback server is unavailable."); return { providerId: provider.id, label: provider.label, embedUrl, allowedOrigins: provider.getAllowedOrigins(), capabilities: provider.getCapabilities() }; }
}
