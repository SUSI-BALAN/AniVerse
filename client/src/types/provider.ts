export type ProviderId = "cinextream" | "yenime" | "zokoanime";
export type PlaybackLanguage = "sub" | "dub";
export type ProviderStatus = "AVAILABLE" | "UNAVAILABLE" | "DISABLED" | "MISCONFIGURED" | "UNKNOWN";
export type ProviderCapabilities = { supportsAniListId: boolean; supportsMalId: boolean; supportsSub: boolean; supportsDub: boolean; supportsEpisodeSelection: boolean; supportsPlaybackEvents: boolean; supportsResume: boolean };
export type ProviderInfo = { id: ProviderId; label: string; enabled: boolean; status: ProviderStatus; capabilities: ProviderCapabilities; allowedOrigins: string[] };
export type ProviderResolveRequest = { providerId: ProviderId; anilistId?: number | null; malId?: number | null; episode: number; language: PlaybackLanguage };
export type ProviderResolveResponse = { providerId: ProviderId; label: string; embedUrl: string; allowedOrigins: string[]; capabilities: ProviderCapabilities };
export type PlayerEvent = { type: "READY" } | { type: "TIME_UPDATE"; currentTime: number; duration: number } | { type: "COMPLETE" } | { type: "ERROR"; reason?: string };
