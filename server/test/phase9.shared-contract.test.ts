import Database from "better-sqlite3";
import pg from "pg";
import { readFileSync } from "node:fs";
import { beforeAll,afterAll,describe,expect,it } from "vitest";
import { initializeDatabase } from "../src/database/connection.js";
import { migratePostgres } from "../src/database/migratePostgres.js";
import { SQLiteUserLibraryRepository,SQLiteUserPlaybackRepository } from "../src/repositories/sqlite.adapters.js";
import { PostgresUserLibraryRepository,PostgresUserPlaybackRepository } from "../src/repositories/postgres.repositories.js";
import type { UserRepositories } from "../src/repositories/repositoryFactory.js";

for(const mode of ["sqlite","postgres"] as const)describe.skipIf(mode==="postgres"&&!process.env.TEST_DATABASE_URL)(`${mode} shared repository contract`,()=>{
  let repositories:UserRepositories,db:Database.Database,pool:pg.Pool;
  const owner="00000000-0000-4000-8000-000000000011";
  beforeAll(async()=>{
    if(mode==="sqlite"){db=new Database(":memory:");initializeDatabase(db);repositories={library:new SQLiteUserLibraryRepository(db),playback:new SQLiteUserPlaybackRepository(db)};}
    else {pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});await pool.query(readFileSync(new URL("./postgres-auth-fixture.sql",import.meta.url),"utf8"));await migratePostgres(pool);await pool.query("INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING",[owner]);repositories={library:new PostgresUserLibraryRepository(pool),playback:new PostgresUserPlaybackRepository(pool)};}
  });
  afterAll(async()=>{if(db)db.close();if(pool){await pool.query("DELETE FROM auth.users WHERE id=$1",[owner]);await pool.end();}});
  it("adds, reads, merges and deletes favorites",async()=>{
    const r=repositories.library;await r.saveFavorite(owner,{anilistId:101,title:"Original"});await r.saveFavorite(owner,{anilistId:101,title:"Updated"});
    expect(await r.favorites(owner)).toHaveLength(1);expect((await r.favorite(owner,101))?.title).toBe("Updated");expect(await r.removeFavorite(owner,101)).toBe(true);expect(await r.favorite(owner,101)).toBeNull();
  });
  it("updates and removes watchlist",async()=>{const r=repositories.library;await r.saveWatchlist(owner,{anilistId:102,title:"List"},"PLANNING");expect((await r.updateWatchlist(owner,102,"WATCHING"))?.status).toBe("WATCHING");expect(await r.watchlist(owner,"WATCHING")).toHaveLength(1);expect(await r.removeWatchlist(owner,102)).toBe(true);});
  it("supplies defaults and persists settings",async()=>{const r=repositories.library;expect((await r.settings(owner)).theme).toBe("dark");await r.saveSetting(owner,"title_preference","romaji");expect(await r.setting(owner,"title_preference")).toBe("romaji");});
  it("normalizes consecutive searches and clears them",async()=>{const r=repositories.library;await r.saveSearch(owner,"  sample   anime ");await r.saveSearch(owner,"sample anime");expect((await r.searches(owner)).map(x=>x.query)).toEqual(["sample anime"]);expect(await r.clearSearches(owner)).toBe(1);});
  it("updates recently viewed and clears it",async()=>{const r=repositories.library;await r.recordViewed(owner,{anilistId:103,title:"Viewed"});expect((await r.recordViewed(owner,{anilistId:103,title:"Viewed"})).viewCount).toBe(2);expect(await r.recentlyViewed(owner)).toHaveLength(1);expect(await r.clearViewed(owner)).toBe(1);});
  it("preserves progress genres and completion",async()=>{const r=repositories.playback,input={anilistId:104,episodeNumber:1,title:"Progress",currentTime:90,duration:100,completed:true,genres:["Fantasy"]};await r.saveProgress(owner,input);await r.saveProgress(owner,{...input,currentTime:10,completed:false});const row=await r.episodeProgress(owner,104,1);expect(row?.completed).toBe(true);expect(row?.genres).toEqual(["Fantasy"]);expect(await r.removeAnimeProgress(owner,104)).toBe(1);});
  it("persists watch history and removes it",async()=>{const r=repositories.playback;const saved=await r.saveHistory(owner,{anilistId:105,episodeNumber:1,title:"History",currentTime:50,duration:100,completed:false});expect(await r.history(owner)).toHaveLength(1);expect(await r.removeHistory(owner,saved.id)).toBe(true);expect(await r.history(owner)).toEqual([]);});
});
