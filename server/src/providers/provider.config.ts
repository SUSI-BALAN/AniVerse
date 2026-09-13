import { env } from "../utils/env.js";
import type { ProviderId } from "./provider.types.js";

export const PROVIDER_LABELS: Record<ProviderId, string> = { cinextream: "Server 1", yenime: "Server 2", zokoanime: "Server 3" };
export const PROVIDER_PRIORITY: ProviderId[] = ["cinextream", "yenime", "zokoanime"];
export const providerConfig = {
  cinextream: { enabled: env.CINEXTREAM_ENABLED, baseUrl: env.CINEXTREAM_BASE_URL, embedPath: env.CINEXTREAM_EMBED_PATH },
  yenime: { enabled: env.YENIME_ENABLED, baseUrl: env.YENIME_BASE_URL, embedPath: env.YENIME_EMBED_PATH },
  zokoanime: { enabled: env.ZOKOANIME_ENABLED, baseUrl: env.ZOKOANIME_BASE_URL, embedPath: env.ZOKOANIME_EMBED_PATH }
};
