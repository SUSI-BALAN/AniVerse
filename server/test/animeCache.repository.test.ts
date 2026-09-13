import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnimeCacheRepository } from "../src/repositories/animeCache.repository.js";

describe("AnimeCacheRepository", () => {
  let db: Database.Database;
  let repository: AnimeCacheRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`CREATE TABLE anime_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, cache_key TEXT NOT NULL UNIQUE, anilist_id INTEGER, payload TEXT NOT NULL, cached_at TEXT NOT NULL, expires_at TEXT NOT NULL)`);
    repository = new AnimeCacheRepository(db);
  });

  afterEach(() => db.close());

  it("writes and reads structured metadata", () => {
    repository.set("details:1", { title: "Naruto" }, 60, 1);
    expect(repository.get("details:1")).toEqual({ title: "Naruto" });
  });

  it("does not return expired entries and can purge them", () => {
    repository.set("details:1", { title: "Naruto" }, 1, 1);
    const future = new Date(Date.now() + 2000);
    expect(repository.get("details:1", future)).toBeNull();
    expect(repository.deleteExpired(future)).toBe(1);
  });
});
