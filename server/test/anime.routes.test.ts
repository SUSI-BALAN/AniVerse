import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AnimeListServiceContract } from "../src/services/anilist.service.js";
import { AppError } from "../src/utils/appError.js";

const page = { data: [], pagination: { page: 1, perPage: 20, hasNextPage: false, total: 0 } };

function serviceMock(): AnimeListServiceContract {
  return {
    search: vi.fn().mockResolvedValue(page),
    trending: vi.fn().mockResolvedValue(page),
    popular: vi.fn().mockResolvedValue(page),
    seasonal: vi.fn().mockResolvedValue(page),
    browse: vi.fn().mockResolvedValue(page),
    details: vi.fn().mockResolvedValue({ id: 1 })
  } as unknown as AnimeListServiceContract;
}

describe("anime API", () => {
  it("trims search text and applies pagination defaults", async () => {
    const service = serviceMock();
    const response = await request(createApp({ animeService: service })).get("/api/anime/search?q=%20naruto%20");
    expect(response.status).toBe(200);
    expect(service.search).toHaveBeenCalledWith("naruto", 1, 20);
  });

  it("rejects empty search queries", async () => {
    const response = await request(createApp({ animeService: serviceMock() })).get("/api/anime/search?q=%20%20");
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it.each(["trending", "popular"])("serves the %s endpoint", async (endpoint) => {
    const response = await request(createApp({ animeService: serviceMock() })).get(`/api/anime/${endpoint}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, pagination: { page: 1 } });
  });

  it("passes an explicit season and year", async () => {
    const service = serviceMock();
    const response = await request(createApp({ animeService: service })).get("/api/anime/seasonal?season=FALL&year=2026");
    expect(response.status).toBe(200);
    expect(service.seasonal).toHaveBeenCalledWith("FALL", 2026, 1, 20);
  });

  it("rejects invalid seasons", async () => {
    const response = await request(createApp({ animeService: serviceMock() })).get("/api/anime/seasonal?season=MONSOON");
    expect(response.status).toBe(400);
  });

  it("loads anime details and rejects invalid IDs", async () => {
    const app = createApp({ animeService: serviceMock() });
    expect((await request(app).get("/api/anime/1")).status).toBe(200);
    expect((await request(app).get("/api/anime/not-a-number")).status).toBe(400);
  });

  it("translates AniList failures without exposing stack traces", async () => {
    const service = serviceMock();
    vi.mocked(service.trending).mockRejectedValue(new AppError(502, "ANILIST_ERROR", "Unable to load anime information right now."));
    const response = await request(createApp({ animeService: service })).get("/api/anime/trending");
    expect(response.status).toBe(502);
    expect(response.body.error).toEqual({ code: "ANILIST_ERROR", message: "Unable to load anime information right now." });
    expect(response.text).not.toContain("at ");
  });
});
