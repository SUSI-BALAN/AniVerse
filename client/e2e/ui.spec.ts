import { expect, test, type Page } from "@playwright/test";

const anime = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  malId: index + 100,
  title: { english: index === 0 ? "Frieren: Beyond Journey's End" : `Anime ${index + 1}`, romaji: null, native: null },
  description: "After the adventure ends, a mage begins a quieter journey through memory, friendship, and time. ".repeat(7),
  coverImage: { large: `https://images.test/cover-${index}.png`, extraLarge: null, color: null },
  bannerImage: index === 1 ? null : `https://images.test/banner-${index}.png`,
  genres: ["Adventure", "Fantasy", "Drama"],
  format: "TV",
  status: "FINISHED",
  season: "FALL",
  seasonYear: 2026,
  episodes: 24,
  duration: 24,
  averageScore: 88 - index,
  popularity: 1000,
  trending: 500,
  studios: ["Studio Test"],
  isAdult: false
}));

const pageResponse = { success: true, data: anime, pagination: { page: 1, perPage: 20, hasNextPage: false, total: 12 } };

async function mockMetadata(page: Page) {
  const errors: string[] = [];
  const favoriteRows: Record<string, unknown>[] = [];
  const watchlistRows: Record<string, unknown>[] = [];
  const historyRows: Record<string, unknown>[] = [];
  let settings: Record<string, string> = { theme: "dark", title_preference: "english", reduced_motion: "false", show_adult_content: "false", default_audio_language: "sub", autoplay: "false", auto_next: "true" };
  await page.route("**/api/library-membership",route=>route.fulfill({json:{success:true,data:{favoriteIds:favoriteRows.map(x=>x.anilistId),watchlist:watchlistRows.map(x=>({anilistId:x.anilistId,status:x.status})),recentlyViewedCount:historyRows.length}}}));
  await page.route("**/api/library/**",route=>{const url=new URL(route.request().url()),collection=url.pathname.split('/').pop();const rows=collection==='favorites'?favoriteRows:collection==='watchlist'?watchlistRows:collection==='recently-viewed'?historyRows:[];const pageSize=Number(url.searchParams.get('pageSize')??24),page=Number(url.searchParams.get('page')??1);return route.fulfill({json:{success:true,data:{items:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length,totalPages:Math.ceil(rows.length/pageSize),genres:[]}}});});
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("https://images.test/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/favorites**", async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === "GET") return route.fulfill({ json: { success: true, data: favoriteRows } });
    if (request.method() === "POST") { const body = request.postDataJSON(); const row = { ...body, id: 1, addedAt: new Date().toISOString() }; favoriteRows.splice(0, favoriteRows.length, row); return route.fulfill({ status: 201, json: { success: true, data: row } }); }
    favoriteRows.splice(0, favoriteRows.length); return route.fulfill({ json: { success: true, data: { removed: true } } });
  });
  await page.route("**/api/watchlist**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { success: true, data: watchlistRows } });
    const body = request.postDataJSON(); const animeBody = body.anime ?? body; const row = { ...animeBody, id: 1, status: body.status ?? "PLANNING", notes: null, addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; watchlistRows.splice(0, watchlistRows.length, row); return route.fulfill({ status: 201, json: { success: true, data: row } });
  });
  await page.route("**/api/history**", async (route) => { const request = route.request(); if (request.method() === "GET") return route.fulfill({ json: { success: true, data: historyRows } }); if (request.method() === "POST") { const body = request.postDataJSON(); const row = { ...body, id: 1, viewCount: 1, lastViewedAt: new Date().toISOString() }; historyRows.splice(0, historyRows.length, row); return route.fulfill({ status: 201, json: { success: true, data: row } }); } return route.fulfill({ json: { success: true, data: { removed: historyRows.length } } }); });
  await page.route("**/api/search-history**", async (route) => { const request = route.request(); if (request.method() === "GET") return route.fulfill({ json: { success: true, data: [] } }); return route.fulfill({ status: 201, json: { success: true, data: { id: 1, query: request.postDataJSON().query, searchedAt: new Date().toISOString() } } }); });
  await page.route("**/api/settings**", async (route) => { const request = route.request(); if (request.method() === "GET") return route.fulfill({ json: { success: true, data: settings } }); const body = request.postDataJSON(); settings = { ...settings, [new URL(request.url()).pathname.split("/").pop()!]: body.value }; return route.fulfill({ json: { success: true, data: { key: new URL(request.url()).pathname.split("/").pop(), value: body.value } } }); });
  await page.route("**/api/progress/**", (route) => { const path = new URL(route.request().url()).pathname; const item = { id: 1, anilistId: 1, episodeNumber: 3, totalEpisodes: 3, currentTime: 100, duration: 100, percentage: 100, completed: true, title: "Frieren: Beyond Journey's End", coverImage: "https://images.test/cover-0.png", malId: 100, providerId: "cinextream", language: "sub", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }; return route.fulfill({ json: { success: true, data: path.endsWith("recently-completed") ? [item] : [] } }); });
  await page.route("**/api/watch-history**", (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/api/stats", (route) => route.fulfill({ json: { success: true, data: { favorites: 0, watchlist: 0, watching: 0, completedAnime: 0, completedEpisodes: 0, inProgressEpisodes: 0, estimatedWatchSeconds: 0, topGenres: [], recentActivity: [] } } }));
  await page.route("**/api/recommendations**", (route) => route.fulfill({ json: { success: true, data: new URL(route.request().url()).pathname.endsWith("because-you-watched") ? { sourceAnime: { id: 1, title: "Frieren: Beyond Journey's End", coverImage: "https://images.test/cover-0.png" }, recommendations: anime.slice(2, 6).map((item) => ({ anime: item, reason: "Recommended for viewers of Frieren" })) } : [] } }));
  await page.route("**/api/providers**", (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.route("**/api/anime/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/api\/anime\/\d+$/.test(pathname)) {
      const item = anime[Number(pathname.split("/").pop()) - 1] ?? anime[0];
      await route.fulfill({ json: { success: true, data: { ...item, synonyms: [], source: "MANGA", countryOfOrigin: "JP", startDate: { year: 2026, month: 1, day: 1 }, endDate: { year: null, month: null, day: null }, trailer: null, relatedAnime: [{ ...anime[1], relationType: "SEQUEL" }], recommendations: anime.slice(2, 8) } } });
      return;
    }
    await route.fulfill({ json: pageResponse });
  });
  return errors;
}

test("home hero, navigation, and responsive layout", async ({ page }) => {
  const errors = await mockMetadata(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1024, height: 800 }, { width: 768, height: 900 }, { width: 430, height: 850 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Frieren: Beyond Journey's End", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /More info/i })).toHaveAttribute("href", "/anime/1");
    await expect(page.getByRole("heading", { name: /Because You Watched Frieren/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recently Completed" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBe(false);
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/home-${viewport.width}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test("mobile navigation and browse filter drawer are usable", async ({ page }) => {
  await mockMetadata(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/browse");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("dialog", { name: "Browse filters" })).toBeVisible();
  await page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Genre").selectOption("Action");
  await page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Season").selectOption("FALL");
  await page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Year", {exact:true}).selectOption("2026");
  await page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Minimum score").selectOption("80");
  await page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Sort").selectOption("TITLE_ASC");
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByRole("button", { name: /Action/ })).toBeVisible();
  await expect(page).toHaveURL(/genres=Action/); await expect(page).toHaveURL(/season=FALL/); await expect(page).toHaveURL(/minScore=80/); await expect(page).toHaveURL(/sort=TITLE_ASC/);
  await page.reload(); await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Browse filters" }).getByLabel("Season")).toHaveValue("FALL");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("settings destructive actions use an accessible confirmation dialog", async ({ page }) => {
  await mockMetadata(page); await page.goto("/settings");
  await page.getByRole("button", { name: "Reset AniVerse Data" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset all AniVerse data?" }); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Reset AniVerse" })).toBeDisabled();
  await dialog.getByRole("textbox").fill("RESET"); await expect(dialog.getByRole("button", { name: "Reset AniVerse" })).toBeEnabled();
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
});

test("local export, scoped reset, and import restore SQLite data", async ({ request }) => {
  await request.delete("http://127.0.0.1:4174/api/data/reset/all");
  const backup = { app: "AniVerse", version: 1, favorites: [{ anilistId: 901, title: "E2E Fixture", genres: ["Fantasy"] }], watchlist: [{ anilistId: 901, title: "E2E Fixture", status: "WATCHING", genres: ["Fantasy"] }], settings: { title_preference: "romaji" }, searchHistory: [{ query: "E2E Fixture" }], recentlyViewed: [{ anilistId: 901, title: "E2E Fixture", viewCount: 1 }], episodeProgress: [1, 2, 3].map((episodeNumber) => ({ anilistId: 901, episodeNumber, totalEpisodes: 3, currentTime: 100, duration: 100, title: "E2E Fixture", completed: true })), watchHistory: [{ anilistId: 901, episodeNumber: 3, totalEpisodes: 3, title: "E2E Fixture", progressPercentage: 100, completed: true }] };
  expect((await request.post("http://127.0.0.1:4174/api/data/import", { data: backup })).ok()).toBe(true);
  const exported = await (await request.get("http://127.0.0.1:4174/api/data/export")).json(); expect(exported.favorites).toHaveLength(1); expect(exported.episodeProgress).toHaveLength(3);
  expect((await (await request.get("http://127.0.0.1:4174/api/progress/recently-completed")).json()).data).toHaveLength(1); expect((await (await request.get("http://127.0.0.1:4174/api/stats")).json()).data.completedEpisodes).toBe(3);
  await request.delete("http://127.0.0.1:4174/api/data/reset/favorites"); expect((await (await request.get("http://127.0.0.1:4174/api/favorites")).json()).data).toHaveLength(0);
  expect((await request.post("http://127.0.0.1:4174/api/data/import", { data: exported })).ok()).toBe(true); expect((await (await request.get("http://127.0.0.1:4174/api/favorites")).json()).data[0].title).toBe("E2E Fixture");
});

test("details supports long descriptions, fallback banners, and keyboard navigation", async ({ page }) => {
  await mockMetadata(page);
  await page.goto("/anime/2");
  await expect(page.getByRole("heading", { name: "Anime 2", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Read more" }).click();
  await expect(page.getByRole("button", { name: "Read less" })).toBeVisible();
  await page.keyboard.press("Tab");
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON"]).toContain(focusedTag);
});

test("reduced motion keeps the hero stable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockMetadata(page);
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  const initial = await heading.textContent();
  await page.waitForTimeout(7500);
  await expect(heading).toHaveText(initial ?? "");
});

test("local favorites and My List actions persist through the UI", async ({ page }) => {
  await mockMetadata(page);
  await page.goto("/anime/1");
  await expect(page.getByRole("button", { name: "Favorite" })).toBeVisible();
  await page.getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByRole("button", { name: "Favorited" })).toBeVisible();
  await expect(page.getByText("Added to Favorites",{exact:true})).toBeVisible();
  await page.getByRole("button", { name: /My List/ }).click();
  await page.getByRole("menuitem", { name: "Watching" }).click();
  await expect(page.getByText("My List updated",{exact:true})).toBeVisible();
  await page.goto("/my-list");
  await expect(page.getByRole("heading", { name: "Frieren: Beyond Journey's End" })).toBeVisible();
  await page.goto("/history");
  await page.getByRole("button", {name:"Recently Viewed",exact:true}).click();
  await expect(page.getByRole("heading", { name: "Frieren: Beyond Journey's End", exact: true })).toBeVisible();
  await page.goto("/settings");
  const titlePreference = page.getByLabel("Title preference");
  await titlePreference.selectOption("romaji");
  await page.reload();
  await expect(page.getByLabel("Title preference")).toHaveValue("romaji");
});

test("main routes remain accessible without horizontal overflow across target viewports", async ({ page }) => {
  test.setTimeout(60_000); await mockMetadata(page);
  const viewports = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  const routes = ["/", "/browse", "/anime/1", "/watch/1/1", "/my-list", "/history", "/stats", "/settings"];
  for (const viewport of viewports) { await page.setViewportSize(viewport); for (const route of routes) { await page.goto(route); await expect(page.locator("h1").first(), `${route} has a primary heading`).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `${route} overflows at ${viewport.width}px`).toBe(false); } }
});
