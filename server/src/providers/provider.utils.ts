import { AppError } from "../utils/appError.js";
import type { PlaybackLanguage, ProviderInput, ProviderValidationResult } from "./provider.types.js";

export function validateProviderInput(input: ProviderInput, supportsAniListId: boolean, supportsMalId: boolean, supportsSub: boolean, supportsDub: boolean): ProviderValidationResult {
  if (!Number.isInteger(input.episode) || input.episode < 1) return { valid: false, code: "INVALID_EPISODE", message: "Episode must be a positive integer." };
  if (input.language !== "sub" && input.language !== "dub") return { valid: false, code: "UNSUPPORTED_LANGUAGE", message: "Language must be sub or dub." };
  if (input.language === "sub" && !supportsSub || input.language === "dub" && !supportsDub) return { valid: false, code: "UNSUPPORTED_LANGUAGE", message: "This provider does not support that language." };
  if (supportsAniListId && input.anilistId != null && Number.isInteger(input.anilistId) && input.anilistId > 0) return { valid: true };
  if (supportsMalId && input.malId != null && Number.isInteger(input.malId) && input.malId > 0) return { valid: true };
  return { valid: false, code: supportsMalId && !supportsAniListId ? "MISSING_MAL_ID" : "MISSING_ANILIST_ID", message: "This server is unavailable for this anime." };
}

export function assertValidProviderInput(result: ProviderValidationResult): void {
  if (!result.valid) throw new AppError(400, result.code, result.message);
}

export function safeEmbedUrl(baseUrl: string, pathTemplate: string, values: Record<string, string | number>, allowedHttps = true): string {
  let base: URL;
  try { base = new URL(baseUrl); } catch { throw new AppError(503, "PROVIDER_MISCONFIGURED", "This provider is not configured correctly."); }
  if (allowedHttps && base.protocol !== "https:") throw new AppError(503, "PROVIDER_MISCONFIGURED", "This provider requires an HTTPS base URL.");
  if (!pathTemplate.startsWith("/")) throw new AppError(503, "PROVIDER_MISCONFIGURED", "This provider embed path is not configured safely.");
  const path = pathTemplate.replace(/\{(anilistId|malId|episode|language)\}/g, (_match, key: string) => encodeURIComponent(String(values[key])));
  const url = new URL(path, base);
  if (url.protocol !== "https:" || url.origin !== base.origin) throw new AppError(503, "INVALID_EMBED_URL", "The provider returned an unsafe embed URL.");
  return url.toString();
}

export function isValidEmbedConfig(baseUrl: string, pathTemplate: string): boolean {
  try { const url = new URL(baseUrl); return url.protocol === "https:" && pathTemplate.startsWith("/") && !pathTemplate.includes("://"); } catch { return false; }
}

export function normalizeLanguage(value: unknown): PlaybackLanguage {
  if (value === "sub" || value === "dub") return value;
  throw new AppError(400, "UNSUPPORTED_LANGUAGE", "Language must be sub or dub.");
}
