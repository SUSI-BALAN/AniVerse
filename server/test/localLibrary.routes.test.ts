import Database from "better-sqlite3";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import schema from "../src/database/schema.sql?raw";

const anime = { anilistId: 1, malId: 2, title: "Naruto", titleRomaji: "Naruto", coverImage: "https://example.com/cover.jpg", bannerImage: null, format: "TV", seasonYear: 2002, averageScore: 80 };
const databases: Database.Database[] = [];
function app() { const db = new Database(":memory:"); db.exec(schema); databases.push(db); return createApp({ database: db, animeService: {} as never }); }
afterEach(() => { while (databases.length) databases.pop()!.close(); });

describe("local library API", () => {
  it("persists favorites and prevents duplicates", async () => {
    const server = app();
    expect((await request(server).post("/api/favorites").send(anime)).status).toBe(201);
    expect((await request(server).post("/api/favorites").send(anime)).status).toBe(201);
    expect((await request(server).get("/api/favorites")).body.data).toHaveLength(1);
    expect((await request(server).get("/api/favorites/1")).body.data.title).toBe("Naruto");
    expect((await request(server).delete("/api/favorites/1")).body.data.removed).toBe(true);
  });

  it("updates watchlist status and rejects invalid values", async () => {
    const server = app();
    await request(server).post("/api/watchlist").send({ ...anime, status: "PLANNING" });
    expect((await request(server).patch("/api/watchlist/1").send({ status: "WATCHING" })).body.data.status).toBe("WATCHING");
    expect((await request(server).patch("/api/watchlist/1").send({ status: "NOPE" })).status).toBe(400);
  });

  it("upserts recently viewed rows and clears history", async () => {
    const server = app();
    await request(server).post("/api/history").send(anime);
    await request(server).post("/api/history").send(anime);
    expect((await request(server).get("/api/history")).body.data[0].viewCount).toBe(2);
    expect((await request(server).delete("/api/history")).body.data.removed).toBe(1);
  });

  it("normalizes consecutive searches and persists settings", async () => {
    const server = app();
    await request(server).post("/api/search-history").send({ query: " Naruto  " });
    await request(server).post("/api/search-history").send({ query: "naruto" });
    expect((await request(server).get("/api/search-history")).body.data).toHaveLength(1);
    await request(server).patch("/api/settings/title_preference").send({ value: "romaji" });
    expect((await request(server).get("/api/settings")).body.data.title_preference).toBe("romaji");
    expect((await request(server).patch("/api/settings/not-allowed").send({ value: "x" })).status).toBe(400);
  });
});
