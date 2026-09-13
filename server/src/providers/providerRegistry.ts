import { CinextreamProvider } from "./cinextream.provider.js";
import { providerConfig } from "./provider.config.js";
import type { AnimeProvider, ProviderId } from "./provider.types.js";
import { YenimeProvider } from "./yenime.provider.js";
import { ZokoanimeProvider } from "./zokoanime.provider.js";

export function createProviderRegistry(): Map<AnimeProvider["id"], AnimeProvider> {
  return new Map<ProviderId, AnimeProvider>([
    ["cinextream", new CinextreamProvider(providerConfig.cinextream.enabled, providerConfig.cinextream.baseUrl, providerConfig.cinextream.embedPath)],
    ["yenime", new YenimeProvider(providerConfig.yenime.enabled, providerConfig.yenime.baseUrl, providerConfig.yenime.embedPath)],
    ["zokoanime", new ZokoanimeProvider(providerConfig.zokoanime.enabled, providerConfig.zokoanime.baseUrl, providerConfig.zokoanime.embedPath)]
  ]);
}
