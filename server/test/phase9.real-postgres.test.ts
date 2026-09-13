import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratePostgres } from "../src/database/migratePostgres.js";
import { PostgresUserLibraryRepository, PostgresUserPlaybackRepository } from "../src/repositories/postgres.repositories.js";

const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("real PostgreSQL migrations and RLS",()=>{
  const pool=new pg.Pool({connectionString:url});
  const a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";
  beforeAll(async()=>{
    await pool.query(readFileSync(new URL("./postgres-auth-fixture.sql",import.meta.url),"utf8"));
    await migratePostgres(pool);
    await pool.query("INSERT INTO auth.users(id) VALUES($1),($2) ON CONFLICT DO NOTHING",[a,b]);
    await pool.query("GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated");
  });
  afterAll(async()=>{await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])",[[a,b]]);await pool.end();});
  it("executes migration once and records its version",async()=>{
    const before=(await pool.query("SELECT * FROM schema_migrations ORDER BY version")).rows;
    await migratePostgres(pool);
    expect((await pool.query("SELECT * FROM schema_migrations ORDER BY version")).rows).toEqual(before);
    expect(before[0].name).toBe("001_user_data.sql");
  });
  it("persists actual PostgreSQL playback and isolates owners",async()=>{
    const repository=new PostgresUserPlaybackRepository(pool);
    await repository.saveProgress(a,{anilistId:9,episodeNumber:1,title:"Actual PostgreSQL",currentTime:60,duration:120,completed:false,genres:["Fantasy"]});
    expect((await repository.episodeProgress(a,9,1))?.currentTime).toBe(60);
    expect(await repository.episodeProgress(b,9,1)).toBeNull();
  });
  it("enforces SELECT UPDATE DELETE and INSERT RLS for another user",async()=>{
    const library=new PostgresUserLibraryRepository(pool);
    await library.saveFavorite(a,{anilistId:8,title:"Private"});
    const client=await pool.connect();
    try {
      await client.query("BEGIN");await client.query("SET LOCAL ROLE authenticated");
      await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[b]);
      expect((await client.query("SELECT * FROM favorites WHERE user_id=$1",[a])).rows).toEqual([]);
      expect((await client.query("UPDATE favorites SET title='Attack' WHERE user_id=$1",[a])).rowCount).toBe(0);
      expect((await client.query("DELETE FROM favorites WHERE user_id=$1",[a])).rowCount).toBe(0);
      await expect(client.query("INSERT INTO favorites(user_id,anilist_id,title) VALUES($1,99,'Attack')",[a])).rejects.toMatchObject({code:"42501"});
    } finally {await client.query("ROLLBACK");client.release();}
    expect((await library.favorite(a,8))?.title).toBe("Private");
  });
});
