import { describe, expect, it } from "vitest";
import { normalizeAnime } from "../src/services/anilist.service.js";
import { getAnimeTitle } from "../src/utils/animeTitle.js";
import { getCurrentAnimeSeason } from "../src/utils/currentSeason.js";
import { sanitizeDescription } from "../src/utils/sanitizeDescription.js";

const rawAnime = {
  id: 1,
  idMal: 20,
  title: { english: "English", romaji: "Romaji", native: "Native" },
  description: "<b>Hero</b><br>Story &amp; more",
  coverImage: { large: "large.jpg", extraLarge: "xl.jpg", color: "#fff" },
  genres: ["Action"],
  studios: { nodes: [{ name: "Studio" }] },
  isAdult: false
};

describe("anime metadata utilities", () => {
  it("normalizes AniList media and removes description markup", () => {
    const anime = normalizeAnime(rawAnime);
    expect(anime).toMatchObject({ id: 1, malId: 20, description: "Hero\nStory & more", studios: ["Studio"] });
  });

  it("uses English, Romaji, Native, then a stable title fallback", () => {
    expect(getAnimeTitle(normalizeAnime(rawAnime))).toBe("English");
    expect(getAnimeTitle({ title: { english: null, romaji: "Romaji", native: "Native" } })).toBe("Romaji");
    expect(getAnimeTitle({ title: { english: null, romaji: null, native: "Native" } })).toBe("Native");
    expect(getAnimeTitle({ title: { english: null, romaji: null, native: null } })).toBe("Untitled anime");
  });

  it("calculates all four anime seasons from normal dates", () => {
    expect(getCurrentAnimeSeason(new Date("2026-01-10T00:00:00Z"))).toEqual({ season: "WINTER", year: 2026 });
    expect(getCurrentAnimeSeason(new Date("2026-04-10T00:00:00Z")).season).toBe("SPRING");
    expect(getCurrentAnimeSeason(new Date("2026-07-10T00:00:00Z")).season).toBe("SUMMER");
    expect(getCurrentAnimeSeason(new Date("2026-10-10T00:00:00Z")).season).toBe("FALL");
  });

  it("returns safe plain text for HTML and entities", () => {
    expect(sanitizeDescription("<script>alert(1)</script><p>A&nbsp;B</p>")).toBe("A B");
    expect(sanitizeDescription(null)).toBeNull();
  });
});
