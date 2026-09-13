import type { AnimeProvider, ProviderCapabilities, ProviderInput, ProviderValidationResult } from "./provider.types.js";
import { isValidEmbedConfig, validateProviderInput } from "./provider.utils.js";

export class ZokoanimeProvider implements AnimeProvider {
  readonly id = "zokoanime" as const; readonly displayName = "Zokoanime"; readonly label = "Server 3";
  constructor(readonly enabled = false, private readonly baseUrl = "", private readonly embedPath = "") {}
  getCapabilities(): ProviderCapabilities { return { supportsAniListId: false, supportsMalId: false, supportsSub: false, supportsDub: false, supportsEpisodeSelection: false, supportsPlaybackEvents: false, supportsResume: false }; }
  getStatus() { return this.enabled && isValidEmbedConfig(this.baseUrl, this.embedPath) ? "AVAILABLE" as const : this.enabled ? "MISCONFIGURED" as const : "DISABLED" as const; }
  validateInput(input: ProviderInput): ProviderValidationResult { return validateProviderInput(input, false, false, false, false); }
  canHandle(_input: ProviderInput) { return false; }
  getEmbedUrl(_input: ProviderInput) { return null; }
  getAllowedOrigins() { return []; }
}
