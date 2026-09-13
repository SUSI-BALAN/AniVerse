import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { initializeDatabase } from "../src/database/connection.js";
import { createApp } from "../src/app.js";
import request from "supertest";

it("upgrades legacy watch history and preserves existing rows through import", async () => {
  const db = new Database(":memory:");
  const schema = readFileSync(new URL("../src/database/schema.sql", import.meta.url), "utf8");
  db.exec(schema.replace(/  total_episodes INTEGER,/g, ""));
  db.prepare("INSERT INTO watch_history(anilist_id,title,episode_number) VALUES(1,'Existing',1)").run();
  initializeDatabase(db);
  expect((db.pragma("table_info(watch_history)") as {name:string}[]).some(c => c.name === "total_episodes")).toBe(true);
  const response = await request(createApp({database:db})).post("/api/data/import").send({app:"AniVerse",version:1,watchHistory:[{anilistId:2,title:"Imported",episodeNumber:1,totalEpisodes:12,progressPercentage:50}]});
  expect(response.status).toBe(200);
  expect(db.prepare("SELECT count(*) AS n FROM watch_history").get()).toEqual({n:2});
  db.close();
});
