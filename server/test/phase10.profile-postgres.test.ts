import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {migratePostgres} from '../src/database/migratePostgres.js';
import {initializeDatabase} from '../src/database/connection.js';
import {PostgresUserProfileRepository,SQLiteUserProfileRepository} from '../src/repositories/profile.repository.js';
import {PostgresUserLibraryRepository,PostgresUserPlaybackRepository} from '../src/repositories/postgres.repositories.js';
import {createApp} from '../src/app.js';
import {env} from '../src/utils/env.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Stage 10.1 real PostgreSQL profile integration',()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const a=randomUUID(),b=randomUUID(),c=randomUUID(),original={...env};
 const repo=new PostgresUserProfileRepository(pool);let app:ReturnType<typeof createApp>;
 beforeAll(async()=>{
  await pool.query(readFileSync(new URL('./postgres-auth-fixture.sql',import.meta.url),'utf8'));await migratePostgres(pool);
  await pool.query('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,c]);
  await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON profiles TO authenticated');
  Object.assign(env,{AUTH_MODE:'supabase',DATABASE_MODE:'postgres',NODE_ENV:'test'});
  app=createApp({postgresPool:pool,repositories:{profile:repo,library:new PostgresUserLibraryRepository(pool),playback:new PostgresUserPlaybackRepository(pool)},tokenVerifier:async token=>[a,b].includes(token)?{id:token,email:token===a?'a@example.invalid':'b@example.invalid',joinedAt:'2025-02-01T00:00:00.000Z'}:null});
 });
 afterAll(async()=>{Object.assign(env,original);await pool.query('DELETE FROM auth.users WHERE id=ANY($1::uuid[])',[[a,b,c]]);await pool.end();});
 const api=(id:string,method:'get'|'patch',data?:object)=>{const r=request(app)[method]('/api/profile').set('Authorization','Bearer '+id);return data?r.send(data):r;};
 it('tracks 002 exactly once and leaves ledger unchanged on second run',async()=>{
  const rows=(await pool.query('SELECT version,name,applied_at FROM schema_migrations ORDER BY version')).rows;
  expect(rows.map(x=>x.name)).toEqual(['001_user_data.sql','002_profiles.sql']);
  await migratePostgres(pool);expect((await pool.query('SELECT version,name,applied_at FROM schema_migrations ORDER BY version')).rows).toEqual(rows);
 });
 it('returns defaults without writes, then persists separate A/B profiles through API',async()=>{
  expect((await api(a,'get')).body.data.createdAt).toBeNull();expect((await pool.query('SELECT * FROM profiles WHERE user_id=$1',[a])).rowCount).toBe(0);
  expect((await api(a,'patch',{displayName:'தமிழ்',avatarId:'avatar-02',user_id:b})).status).toBe(200);
  expect((await api(b,'get')).body.data.displayName).toBe('Anime Explorer');
  expect((await api(b,'patch',{displayName:'User B',avatarId:'avatar-04',ownerId:a})).status).toBe(200);
  expect((await api(a,'get')).body.data.displayName).toBe('தமிழ்');expect((await api(b,'get')).body.data.displayName).toBe('User B');
  const client=await pool.connect();try{
   await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[a]);
   expect((await client.query('SELECT * FROM profiles WHERE user_id=$1',[b])).rowCount).toBe(0);
   expect((await client.query("UPDATE profiles SET display_name='Attack' WHERE user_id=$1",[b])).rowCount).toBe(0);
   expect((await client.query('DELETE FROM profiles WHERE user_id=$1',[b])).rowCount).toBe(0);
  }finally{await client.query('ROLLBACK');client.release();}
  expect((await repo.getProfile(b)).displayName).toBe('User B');
 });
 it('enforces direct RLS SELECT INSERT UPDATE DELETE and prevents ownership transfer',async()=>{
  await repo.updateProfile(a,{displayName:'Owner A'});
  const client=await pool.connect();try{
   await client.query('BEGIN');await client.query('SET LOCAL ROLE authenticated');await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[b]);
   expect((await client.query('SELECT user_id FROM profiles')).rows).toEqual([{user_id:b}]);
   expect((await client.query('SELECT * FROM profiles WHERE user_id=$1',[a])).rowCount).toBe(0);
   expect((await client.query("UPDATE profiles SET display_name='Attack' WHERE user_id=$1",[a])).rowCount).toBe(0);
   expect((await client.query('DELETE FROM profiles WHERE user_id=$1',[a])).rowCount).toBe(0);
   await client.query('SAVEPOINT denied_insert');await expect(client.query("INSERT INTO profiles(user_id,display_name,avatar_id) VALUES($1,'Attack','avatar-01')",[c])).rejects.toMatchObject({code:'42501'});await client.query('ROLLBACK TO SAVEPOINT denied_insert');
   await client.query('SAVEPOINT denied_transfer');await expect(client.query('UPDATE profiles SET user_id=$1 WHERE user_id=$2',[c,b])).rejects.toMatchObject({code:'42501'});await client.query('ROLLBACK TO SAVEPOINT denied_transfer');
   expect((await client.query("UPDATE profiles SET display_name='Own B' WHERE user_id=$1",[b])).rowCount).toBe(1);
   expect((await client.query('DELETE FROM profiles WHERE user_id=$1',[b])).rowCount).toBe(1);
   expect((await client.query("INSERT INTO profiles(user_id,display_name,avatar_id) VALUES($1,'Own B','avatar-03')",[b])).rowCount).toBe(1);
  }finally{await client.query('ROLLBACK');client.release();}
 });
 it('normalizes SQLite/PostgreSQL fields, nullability and Unicode validation identically',async()=>{
  const db=new Database(':memory:');initializeDatabase(db);const local=new SQLiteUserProfileRepository(db);
  try{
   const cloudDefault=await repo.getProfile(c),localDefault=await local.getProfile('local');
   expect({...cloudDefault,userId:'local'}).toEqual(localDefault);
   for(const r of [local,repo]){const id=r===local?'local':c;const p=await r.updateProfile(id,{displayName:'  🌸 தமிழ்  ',avatarId:'avatar-06'});expect(p.displayName).toBe('🌸 தமிழ்');expect(p.avatarId).toBe('avatar-06');expect(new Date(p.createdAt!).toISOString()).toBe(p.createdAt);await expect(r.updateProfile(id,{displayName:'\u0000'})).rejects.toThrow();await expect(r.updateProfile(id,{avatarId:'avatar-99' as never})).rejects.toThrow();}
  }finally{db.close();}
 });
 it('enforces database constraints and cascading auth deletion',async()=>{
  await expect(pool.query("UPDATE profiles SET display_name='' WHERE user_id=$1",[c])).rejects.toMatchObject({code:'23514'});
  await expect(pool.query("UPDATE profiles SET avatar_id='invalid' WHERE user_id=$1",[c])).rejects.toMatchObject({code:'23514'});
  await pool.query('DELETE FROM auth.users WHERE id=$1',[c]);expect((await pool.query('SELECT * FROM profiles WHERE user_id=$1',[c])).rowCount).toBe(0);
 });
 it('preserves separate fields during concurrent partial updates',async()=>{
  await Promise.all([repo.updateProfile(a,{displayName:'Concurrent'}),repo.updateProfile(a,{avatarId:'avatar-05'})]);
  expect(await repo.getProfile(a)).toMatchObject({displayName:'Concurrent',avatarId:'avatar-05'});
 });
});
