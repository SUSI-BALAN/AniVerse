import pg from "pg";
import request from "supertest";
import {readFileSync} from "node:fs";
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {createApp} from "../src/app.js";
import {env} from "../src/utils/env.js";
import {migratePostgres} from "../src/database/migratePostgres.js";
import {PostgresUserLibraryRepository,PostgresUserPlaybackRepository} from "../src/repositories/postgres.repositories.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("real API ownership for every private resource",()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const a="00000000-0000-4000-8000-000000000021",b="00000000-0000-4000-8000-000000000022";
 const original={...env};let app:ReturnType<typeof createApp>;
 beforeAll(async()=>{
  await pool.query(readFileSync(new URL("./postgres-auth-fixture.sql",import.meta.url),"utf8"));await migratePostgres(pool);
  await pool.query("INSERT INTO auth.users(id) VALUES($1),($2) ON CONFLICT DO NOTHING",[a,b]);
  env.DATABASE_MODE="postgres";env.AUTH_MODE="supabase";
  app=createApp({postgresPool:pool,repositories:{library:new PostgresUserLibraryRepository(pool),playback:new PostgresUserPlaybackRepository(pool)},tokenVerifier:async token=>token===a||token===b?{id:token}:null,animeService:{popular:async()=>({data:[],pagination:{page:1,perPage:25,total:0,hasNextPage:false}}),topRated:async()=>({data:[],pagination:{page:1,perPage:25,total:0,hasNextPage:false}})} as never});
 });
 afterAll(async()=>{Object.assign(env,original);await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])",[[a,b]]);await pool.end();});
 it("isolates writes reads statistics recommendations export import and resets",async()=>{
  const snapshot={anilistId:201,title:"A only",genres:["Fantasy"],userId:b,ownerId:b};
  for(const path of ["favorites","history"]){expect((await request(app).post(`/api/${path}`).set("Authorization",`Bearer ${a}`).send(snapshot)).status).toBe(201);}
  expect((await request(app).post("/api/watchlist").set("Authorization",`Bearer ${a}`).send({anime:snapshot,status:"WATCHING",userId:b})).status).toBe(201);
  expect((await request(app).post("/api/search-history").set("Authorization",`Bearer ${a}`).send({query:"A search",ownerId:b})).status).toBe(201);
  expect((await request(app).patch("/api/settings/title_preference").set("Authorization",`Bearer ${a}`).send({value:"romaji",userId:b})).status).toBe(200);
  expect((await request(app).put("/api/progress/201/1").set("Authorization",`Bearer ${a}`).send({title:"A only",duration:100,currentTime:60,userId:b})).status).toBe(200);
  for(const path of ["favorites","watchlist","history","search-history","watch-history","progress/201"]){
   expect((await request(app).get(`/api/${path}?userId=${a}`).set("Authorization",`Bearer ${b}`)).body.data).toEqual([]);
   expect((await request(app).get(`/api/${path}`).set("Authorization",`Bearer ${a}`)).body.data).toHaveLength(1);
  }
  expect((await request(app).get("/api/settings").set("Authorization",`Bearer ${b}`)).body.data.title_preference).toBe("english");
  expect((await request(app).get("/api/stats").set("Authorization",`Bearer ${b}`)).body.data.favorites).toBe(0);
  expect((await request(app).get("/api/stats").set("Authorization",`Bearer ${a}`)).body.data.favorites).toBe(1);
  expect((await request(app).get("/api/recommendations").set("Authorization",`Bearer ${b}`)).body.data).toEqual([]);
  const backup=(await request(app).get("/api/data/export").set("Authorization",`Bearer ${a}`)).body;
  expect(backup.favorites).toHaveLength(1);expect(JSON.stringify(backup)).not.toContain(a);
  expect((await request(app).get("/api/data/export").set("Authorization",`Bearer ${b}`)).body.favorites).toEqual([]);
  expect((await request(app).post("/api/data/import").set("Authorization",`Bearer ${b}`).send(backup)).status).toBe(200);
  expect((await request(app).get("/api/favorites").set("Authorization",`Bearer ${b}`)).body.data).toHaveLength(1);
  expect((await request(app).delete("/api/data/reset/all").set("Authorization",`Bearer ${b}`)).status).toBe(200);
  expect((await request(app).get("/api/favorites").set("Authorization",`Bearer ${a}`)).body.data).toHaveLength(1);
 });
 it('isolates recent searches through clear reset export and import',async()=>{
  const get=(owner:string,path:string)=>request(app).get(path).auth(owner,{type:'bearer'});
  for(const [owner,query] of [[a,'Private search A'],[b,'Private search B']]){
    expect((await request(app).delete('/api/search-history').auth(owner,{type:'bearer'})).status).toBe(200);
    expect((await request(app).post('/api/search-history').auth(owner,{type:'bearer'}).send({query})).status).toBe(201);
    expect((await get(owner,'/api/search-history')).body.data.map((x:{query:string})=>x.query)).toEqual([query]);
  }
  const backup=(await get(a,'/api/data/export')).body;expect(backup.searchHistory.map((x:{query:string})=>x.query)).toEqual(['Private search A']);
  expect((await request(app).delete('/api/data/reset/search-history').auth(a,{type:'bearer'})).status).toBe(200);
  expect((await get(a,'/api/search-history')).body.data).toEqual([]);expect((await get(b,'/api/search-history')).body.data.map((x:{query:string})=>x.query)).toEqual(['Private search B']);
  expect((await request(app).post('/api/data/import').auth(a,{type:'bearer'}).send(backup)).status).toBe(200);
  expect((await get(a,'/api/search-history')).body.data.map((x:{query:string})=>x.query)).toEqual(['Private search A']);
 });
});
