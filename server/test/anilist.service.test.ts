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

  it("coalesces identical concurrent catalog requests", async () => {
    const cache = cacheMock();
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: { Page: { pageInfo: { currentPage: 1, perPage: 20, hasNextPage: false, total: 0 }, media: [] } } }), { status: 200 }));
    const service = new AniListService(cache, fetcher);
    await Promise.all([service.search("naruto", 1, 20), service.search("naruto", 1, 20)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('releases a failed coalesced request before retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ data: { Page: { media: [] } } })));
    const service = new AniListService(cacheMock(), fetcher);
    const results = await Promise.allSettled([service.search('retry',1,20), service.search('retry',1,20)]);
    expect(results.every(x => x.status === 'rejected')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(service.search('retry',1,20)).resolves.toMatchObject({data:[]});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses documented inclusive start-date year bounds', async () => {
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{Page:{media:[]}}})));
    await new AniListService(cacheMock(),fetcher).browse({genres:['Action','Comedy'],yearFrom:2020,yearTo:2026,sort:'SCORE'},1,20);
    const outgoing=JSON.parse(fetcher.mock.calls[0][1].body);
    expect(outgoing.query).toContain('startDate_greater: $yearFrom');expect(outgoing.query).not.toContain('seasonYear_greater');
    expect(outgoing.variables).toMatchObject({yearFrom:20199999,yearTo:20270000,genre_in:['Action','Comedy'],sort:['SCORE_DESC']});
  });
  it.each([429,500,503])('normalizes upstream %s without retry storms',async status=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({errors:[{}]}),{status}));
    await expect(new AniListService(cacheMock(),fetcher).search('failure',1,20)).rejects.toMatchObject({code:'ANILIST_UNAVAILABLE',status:503});expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('normalizes upstream timeout',async()=>{
    const fetcher=vi.fn().mockRejectedValue(Object.assign(new Error('aborted'),{name:'AbortError'}));
    await expect(new AniListService(cacheMock(),fetcher).search('timeout',1,20)).rejects.toMatchObject({code:'ANILIST_TIMEOUT',status:504});
  });
});
