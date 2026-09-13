import { describe, expect, it, vi } from "vitest";
import type { AnimeCacheRepository } from "../src/repositories/animeCache.repository.js";
import { AniListService } from "../src/services/anilist.service.js";

const media = { id: 1, title: { romaji: "Naruto" }, coverImage: {}, genres: [], studios: { nodes: [] }, isAdult: false };

function cacheMock() {
  return { get: vi.fn().mockReturnValue(null), set: vi.fn(), delete: vi.fn(), deleteExpired: vi.fn() } as unknown as AnimeCacheRepository;
}

describe("AniListService", () => {
  it("normalizes a trending response and caches it", async () => {
    const cache = cacheMock();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { Page: { pageInfo: { currentPage: 1, perPage: 20, hasNextPage: false, total: 1 }, media: [media] } } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const result = await new AniListService(cache, fetcher).trending(1, 20);
    expect(result.data[0].title.romaji).toBe("Naruto");
    expect(cache.set).toHaveBeenCalled();
  });

  it("returns a valid cached response without a network call", async () => {
    const cache = cacheMock();
    vi.mocked(cache.get).mockReturnValue({ data: [], pagination: { page: 1, perPage: 20, hasNextPage: false, total: 0 } });
    const fetcher = vi.fn();
    await new AniListService(cache, fetcher).popular(1, 20);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports malformed and unavailable AniList responses", async () => {
    const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await expect(new AniListService(cacheMock(), malformed).popular(1, 20)).rejects.toMatchObject({ code: "ANILIST_MALFORMED_RESPONSE" });
    const unavailable = vi.fn().mockRejectedValue(new TypeError("network"));
    await expect(new AniListService(cacheMock(), unavailable).popular(1, 20)).rejects.toMatchObject({ code: "ANILIST_ERROR" });
    const disabled = vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "disabled" }] }), { status: 403 }));
    await expect(new AniListService(cacheMock(), disabled).popular(1, 20)).rejects.toMatchObject({ code: "ANILIST_UNAVAILABLE", status: 503 });
  });
});
