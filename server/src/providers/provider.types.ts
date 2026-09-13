export type ProviderId = "cinextream" | "yenime" | "zokoanime";
export type PlaybackLanguage = "sub" | "dub";
export type ProviderStatus = "AVAILABLE" | "UNAVAILABLE" | "DISABLED" | "MISCONFIGURED" | "UNKNOWN";

export type ProviderCapabilities = {
  supportsAniListId: boolean;
  supportsMalId: boolean;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsEpisodeSelection: boolean;
  supportsPlaybackEvents: boolean;
  supportsResume: boolean;
};

export type ProviderInput = { anilistId?: number | null; malId?: number | null; episode: number; language: PlaybackLanguage };
export type ProviderValidationResult = { valid: true } | { valid: false; code: string; message: string };

export interface AnimeProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly label: string;
  readonly enabled: boolean;
  getStatus(): ProviderStatus;
  getCapabilities(): ProviderCapabilities;
  canHandle(input: ProviderInput): boolean;
  getEmbedUrl(input: ProviderInput): string | null;
  getAllowedOrigins(): string[];
  validateInput(input: ProviderInput): ProviderValidationResult;
}

export type PlayerEvent =
  | { type: "READY" }
  | { type: "TIME_UPDATE"; currentTime: number; duration: number }
  | { type: "COMPLETE" }
  | { type: "ERROR"; reason?: string };
