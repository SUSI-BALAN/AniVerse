import { useEffect, useState } from "react";
import type { ProviderId } from "../../types/provider";
import { isAllowedEmbedUrl, parsePlayerMessage } from "../../utils/playerSecurity";

export type PlayerError = { code: string; message: string };

export function AnimePlayer({ embedUrl, allowedOrigins, providerId, animeId, episode, language, title, onReady, onError, onTimeUpdate, onComplete }: {
  embedUrl: string; allowedOrigins: string[]; providerId: ProviderId; animeId: number; episode: number; language: "sub" | "dub"; title: string;
  onReady?: () => void; onError?: (error: PlayerError) => void; onTimeUpdate?: (event: { currentTime: number; duration: number }) => void; onComplete?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const key = `${providerId}-${animeId}-${episode}-${language}`;
  useEffect(() => { const bad = !isAllowedEmbedUrl(embedUrl, allowedOrigins); setLoaded(false); setInvalid(bad); if (bad) onError?.({ code: "INVALID_EMBED_URL", message: "This playback server returned an invalid embed URL." }); }, [embedUrl, allowedOrigins, onError]);
  useEffect(() => {
    const handler = (event: MessageEvent<unknown>) => {
      const parsed = parsePlayerMessage(event, allowedOrigins); if (!parsed) return;
      if (parsed.type === "READY") { setLoaded(true); onReady?.(); }
      if (parsed.type === "TIME_UPDATE") onTimeUpdate?.(parsed);
      if (parsed.type === "COMPLETE") onComplete?.();
      if (parsed.type === "ERROR") onError?.({ code: "PLAYER_ERROR", message: parsed.reason ?? "This server could not load the episode." });
    };
    window.addEventListener("message", handler); return () => window.removeEventListener("message", handler);
  }, [allowedOrigins, onComplete, onError, onReady, onTimeUpdate]);
  if (invalid) return <div className="flex aspect-video items-center justify-center bg-black text-sm text-muted">Player unavailable</div>;
  return <div className="relative aspect-video overflow-hidden rounded-md border border-outline bg-black shadow-2xl">
    {!loaded && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black text-sm text-muted" role="status">Loading {providerId}…</div>}
    <iframe key={key} src={embedUrl} title={`Watching ${title} Episode ${episode}`} className="h-full w-full" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} />
  </div>;
}
