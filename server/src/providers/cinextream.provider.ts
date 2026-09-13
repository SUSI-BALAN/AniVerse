import type { AnimeProvider, ProviderCapabilities, ProviderInput, ProviderValidationResult } from "./provider.types.js";
import { assertValidProviderInput, isValidEmbedConfig, safeEmbedUrl, validateProviderInput } from "./provider.utils.js";

export class CinextreamProvider implements AnimeProvider {
  readonly id = "cinextream" as const; readonly displayName = "Cinextream"; readonly label = "Server 1";
  constructor(readonly enabled: boolean, private readonly baseUrl: string, private readonly embedPath: string) {}
  getCapabilities(): ProviderCapabilities { return { supportsAniListId: true, supportsMalId: false, supportsSub: true, supportsDub: true, supportsEpisodeSelection: true, supportsPlaybackEvents: true, supportsResume: true }; }
  getStatus() { return !this.enabled ? "DISABLED" as const : isValidEmbedConfig(this.baseUrl, this.embedPath) ? "AVAILABLE" as const : "MISCONFIGURED" as const; }
  validateInput(input: ProviderInput): ProviderValidationResult { return validateProviderInput(input, true, false, true, true); }
  canHandle(input: ProviderInput) { return this.getStatus() === "AVAILABLE" && this.validateInput(input).valid; }
  getEmbedUrl(input: ProviderInput): string | null { const result = this.validateInput(input); assertValidProviderInput(result); if (!this.canHandle(input)) return null; return safeEmbedUrl(this.baseUrl, this.embedPath, { anilistId: input.anilistId!, episode: input.episode, language: input.language }); }
  getAllowedOrigins() { try { return [new URL(this.baseUrl).origin]; } catch { return []; } }
}
