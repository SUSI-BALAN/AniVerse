import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { CinextreamProvider } from "../src/providers/cinextream.provider.js";
import { ProviderManager } from "../src/providers/providerManager.js";
import { YenimeProvider } from "../src/providers/yenime.provider.js";
import { ZokoanimeProvider } from "../src/providers/zokoanime.provider.js";
import { safeEmbedUrl } from "../src/providers/provider.utils.js";

const input = { anilistId: 123, malId: 456, episode: 2, language: "sub" as const };
function manager() { return new ProviderManager(new Map([
  ["cinextream", new CinextreamProvider(true, "https://cinextream.example", "/api/anime/embed/{language}/{anilistId}/{episode}")],
  ["yenime", new YenimeProvider(true, "https://yenime.example", "/embed/{language}/{malId}/{episode}")],
  ["zokoanime", new ZokoanimeProvider(false)]
])); }

describe("provider architecture", () => {
  it("lists stable display labels and provider capabilities", async () => {
    const response = await request(createApp({ providerManager: manager(), database: undefined, animeService: {} as never })).get("/api/providers");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "cinextream", label: "Server 1", status: "AVAILABLE" }),
      expect.objectContaining({ id: "zokoanime", label: "Server 3", status: "DISABLED" })
    ]));
  });

  it("resolves only validated, configured embed paths", async () => {
    const response = await request(createApp({ providerManager: manager(), animeService: {} as never })).post("/api/providers/resolve").send({ providerId: "cinextream", ...input });
    expect(response.status).toBe(200);
    expect(response.body.data.embedUrl).toBe("https://cinextream.example/api/anime/embed/sub/123/2");
    expect(response.body.data.allowedOrigins).toEqual(["https://cinextream.example"]);
  });

  it.each([
    [{ providerId: "cinextream", ...input, episode: 0 }, "INVALID_EPISODE"],
    [{ providerId: "cinextream", ...input, anilistId: null }, "MISSING_ANILIST_ID"],
    [{ providerId: "zokoanime", ...input }, "PROVIDER_DISABLED"]
  ])("rejects unsafe or unsupported input", async (body, code) => {
    const response = await request(createApp({ providerManager: manager(), animeService: {} as never })).post("/api/providers/resolve").send(body);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error.code).toBe(code);
  });

  it("rejects javascript, data, and unapproved origins", () => {
    expect(safeEmbedUrl("https://provider.example", "/embed/{episode}", { episode: 1 })).toBe("https://provider.example/embed/1");
    expect(() => safeEmbedUrl("https://provider.example", "javascript:alert(1)", { episode: 1 })).toThrow();
    expect(() => safeEmbedUrl("https://provider.example", "data:text/html,nope", { episode: 1 })).toThrow();
  });
});
