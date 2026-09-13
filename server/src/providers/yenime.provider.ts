import type { AnimeProvider, ProviderCapabilities, ProviderInput, ProviderValidationResult } from "./provider.types.js";
import { assertValidProviderInput, isValidEmbedConfig, safeEmbedUrl, validateProviderInput } from "./provider.utils.js";

export class YenimeProvider implements AnimeProvider {
  readonly id = "yenime" as const; readonly displayName = "Yenime"; readonly label = "Server 2";
  constructor(readonly enabled: boolean, private readonly baseUrl: string, private readonly embedPath: string) {}
  getCapabilities(): ProviderCapabilities { return { supportsAniListId: false, supportsMalId: true, supportsSub: true, supportsDub: true, supportsEpisodeSelection: true, supportsPlaybackEvents: false, supportsResume: false }; }
  getStatus() { return !this.enabled ? "DISABLED" as const : isValidEmbedConfig(this.baseUrl, this.embedPath) ? "AVAILABLE" as const : "MISCONFIGURED" as const; }
  validateInput(input: ProviderInput): ProviderValidationResult { return validateProviderInput(input, false, true, true, true); }
  canHandle(input: ProviderInput) { return this.getStatus() === "AVAILABLE" && this.validateInput(input).valid; }
  getEmbedUrl(input: ProviderInput): string | null { const result = this.validateInput(input); assertValidProviderInput(result); if (!this.canHandle(input)) return null; return safeEmbedUrl(this.baseUrl, this.embedPath, { malId: input.malId!, episode: input.episode, language: input.language }); }
  getAllowedOrigins() { try { return [new URL(this.baseUrl).origin]; } catch { return []; } }
}
