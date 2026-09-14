import Database from 'better-sqlite3';
import pg from 'pg';
import request from 'supertest';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {migratePostgres} from '../src/database/migratePostgres.js';
import {initializeDatabase} from '../src/database/connection.js';
import {PostgresLibraryQueryRepository,SQLiteLibraryQueryRepository,libraryQuerySchema,collections} from '../src/repositories/libraryQuery.repository.js';
import {SQLiteUserLibraryRepository,SQLiteUserPlaybackRepository} from '../src/repositories/sqlite.adapters.js';
import {PostgresUserLibraryRepository,PostgresUserPlaybackRepository} from '../src/repositories/postgres.repositories.js';
import {createApp} from '../src/app.js';
import {env} from '../src/utils/env.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Stage 10.2 real PostgreSQL library parity and isolation',()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});const a=randomUUID(),b=randomUUID();const original={...env};const db=new Database(':memory:');
 const cloud=new PostgresLibraryQueryRepository(pool),local=new SQLiteLibraryQueryRepository(db);let app:ReturnType<typeof createApp>;
 beforeAll(async()=>{
  await pool.query(readFileSync(new URL('./postgres-auth-fixture.sql',import.meta.url),'utf8'));await migratePostgres(pool);await pool.query('INSERT INTO auth.users(id) VALUES($1),($2)',[a,b]);initializeDatabase(db);
  const lr=new SQLiteUserLibraryRepository(db),lp=new SQLiteUserPlaybackRepository(db),cr=new PostgresUserLibraryRepository(pool),cp=new PostgresUserPlaybackRepository(pool);
  for(let i=1;i<=30;i++){const anime={anilistId:i,title:i<=2?'Equal title':i===3?'Éclair தமிழ்':`Anime ${String(i).padStart(2,'0')}`,titleRomaji:`Romaji ${i}`,genres:i%2?['Action']:['Drama'],seasonYear:i===30?null:2000+i,averageScore:i===30?null:i};
   for(const [repo,id]of [[lr,'local'],[cr,a]] as const){await repo.saveFavorite(id,anime);await repo.saveWatchlist(id,anime,i%2?'WATCHING':'PLANNING');await repo.recordViewed(id,anime);}
   for(const [repo,id]of [[lp,'local'],[cp,a]] as const){const input={...anime,episodeNumber:1,totalEpisodes:1,currentTime:i%2?90:100,duration:100,completed:i%2===0};await repo.saveProgress(id,input);await repo.saveHistory(id,input);}
  }
  await cr.saveFavorite(b,{anilistId:90001,title:'Private B',genres:['Private']});await cr.saveWatchlist(b,{anilistId:90001,title:'Private B'},'DROPPED');
  for(const [table,column]of [['favorites','added_at'],['watchlist','updated_at'],['recently_viewed','last_viewed_at'],['watch_history','watched_at'],['episode_progress','last_watched_at'],['episode_progress','completed_at']] as const){await pool.query(`UPDATE ${table} SET ${column}='2025-01-01T00:00:00Z' WHERE user_id=$1`,[a]);db.prepare(`UPDATE ${table} SET ${column}='2025-01-01 00:00:00'`).run();}
  Object.assign(env,{AUTH_MODE:'supabase',DATABASE_MODE:'postgres',NODE_ENV:'test'});app=createApp({postgresPool:pool,repositories:{library:cr,playback:cp,queries:cloud},tokenVerifier:async value=>[a,b].includes(value)?{id:value}:null});
 },30000);
 afterAll(async()=>{Object.assign(env,original);await pool.query('DELETE FROM auth.users WHERE id=ANY($1::uuid[])',[[a,b]]);await pool.end();db.close();});
 it.each(collections)('matches SQLite paging/search/filter/date ordering for %s',async c=>{
  for(const input of [{pageSize:12},{pageSize:12,page:2},{genre:'action'},{search:'ÉCLAIR'},{search:'ROMAJI 30'},{sort:'title',direction:'asc'},{sort:'date',direction:'asc'},{page:99}]){const q=libraryQuerySchema.parse(input);const l=await local.list('local',c,q),p=await cloud.list(a,c,q);const clean=(x:typeof l)=>({...x,items:x.items.map(({id:_id,...item})=>item)});expect(clean(p)).toEqual(clean(l));}
 });
 it('matches nullable score/year ordering and watchlist status filters',async()=>{for(const input of [{sort:'score',direction:'desc'},{sort:'year',direction:'asc'},{status:'WATCHING',genre:'Action'}]){const q=libraryQuerySchema.parse(input);const l=await local.list('local','watchlist',q),p=await cloud.list(a,'watchlist',q);expect(p.items.map(x=>x.anilistId)).toEqual(l.items.map(x=>x.anilistId));expect(p.total).toBe(l.total);}});
 it('derives ownership only from auth and keeps compact membership owner scoped',async()=>{
  for(const id of [a,b]){const r=await request(app).get('/api/library/favorites?pageSize=12').set('Authorization','Bearer '+id);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body.data.total).toBe(id===a?30:1);expect(r.body.data.items.every((x:{anilistId:number})=>id===a?x.anilistId<100:x.anilistId===90001)).toBe(true);}
  expect((await request(app).get('/api/library/favorites?userId='+b).set('Authorization','Bearer '+a)).status).toBe(400);
  expect((await cloud.membership(b)).favoriteIds).toEqual([90001]);expect((await cloud.membership(a)).watchlist).toHaveLength(30);
 });
 it('keeps direct RLS isolation for SELECT UPDATE DELETE and rejects foreign INSERT',async()=>{
  await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON favorites,watchlist,recently_viewed,watch_history,episode_progress TO authenticated');const client=await pool.connect();try{await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[a]);
   for(const table of ['favorites','watchlist','recently_viewed','watch_history','episode_progress']){expect((await client.query(`SELECT * FROM ${table} WHERE user_id=$1`,[b])).rowCount).toBe(0);expect((await client.query(`UPDATE ${table} SET title='Denied' WHERE user_id=$1`,[b])).rowCount).toBe(0);expect((await client.query(`DELETE FROM ${table} WHERE user_id=$1`,[b])).rowCount).toBe(0);}
   await client.query('SAVEPOINT foreign_insert');await expect(client.query("INSERT INTO favorites(user_id,anilist_id,title) VALUES($1,99000,'Denied')",[b])).rejects.toMatchObject({code:'42501'});await client.query('ROLLBACK TO SAVEPOINT foreign_insert');
  }finally{await client.query('ROLLBACK');client.release();}
 });
 it('keeps cloud preference export/import symmetry and owner/reset isolation',async()=>{const api=(path:string)=>request(app).get(path).set('Authorization','Bearer '+a);await request(app).patch('/api/settings/library_view_mode').set('Authorization','Bearer '+a).send({value:'list'});const backup=(await api('/api/data/export')).body;expect(backup.settings.library_view_mode).toBe('list');await request(app).delete('/api/data/reset/favorites').set('Authorization','Bearer '+a);expect((await cloud.list(b,'favorites',libraryQuerySchema.parse({}))).total).toBe(1);expect((await cloud.list(a,'watchlist',libraryQuerySchema.parse({}))).total).toBe(30);expect((await request(app).post('/api/data/import').set('Authorization','Bearer '+a).send(backup)).status).toBe(200);expect((await cloud.list(a,'favorites',libraryQuerySchema.parse({}))).total).toBe(30);});
});
