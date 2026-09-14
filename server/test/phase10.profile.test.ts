import Database from 'better-sqlite3';
import request from 'supertest';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createApp} from '../src/app.js';
import {initializeDatabase} from '../src/database/connection.js';
import {env} from '../src/utils/env.js';
import {SQLiteUserProfileRepository} from '../src/repositories/profile.repository.js';
import {createUserRepositories} from '../src/repositories/repositoryFactory.js';
import {defaultProfile,type Profile} from '../src/types/profile.types.js';
import {profilePatchSchema} from '../src/utils/profileValidation.js';

let db:Database.Database;
const original={...env};
beforeEach(()=>{Object.assign(env,{NODE_ENV:'test',DATABASE_MODE:'sqlite',AUTH_MODE:'local'});db=new Database(':memory:');initializeDatabase(db);});
afterEach(()=>{db.close();Object.assign(env,original);});
describe('profile API and SQLite storage',()=>{
 it('returns defaults without writing and honest local identity',async()=>{
  const app=createApp({database:db});const r=await request(app).get('/api/profile');
  expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');
  expect(r.body.data).toMatchObject({displayName:'Anime Explorer',avatarId:'avatar-01',createdAt:null,updatedAt:null,mode:'local',email:null,joinedAt:null});
  expect(r.body.data).not.toHaveProperty('userId');expect(db.prepare('SELECT count(*) AS n FROM profiles').get()).toEqual({n:0});
 });
 it('persists trimmed Unicode names and partial avatar updates with normalized timestamps',async()=>{
  const app=createApp({database:db});const first=await request(app).patch('/api/profile').send({displayName:'  தமிழ் பெயர்  ',avatarId:'avatar-03'});
  expect(first.status).toBe(200);expect(first.body.data.displayName).toBe('தமிழ் பெயர்');
  expect(first.body.data.createdAt).toMatch(/^\d{4}-.*Z$/);
  const second=await request(app).patch('/api/profile').send({avatarId:'avatar-06'});
  expect(second.body.data).toMatchObject({displayName:'தமிழ் பெயர்',avatarId:'avatar-06',createdAt:first.body.data.createdAt});
  expect((await request(app).get('/api/profile')).body.data).toEqual(second.body.data);
 });
 it.each(['','   ','\u200b','name\n','name\u0000','x'.repeat(41)])('rejects invalid names without creating a profile (%#)',async name=>{
  const r=await request(createApp({database:db})).patch('/api/profile').send({displayName:name});
  expect(r.status).toBe(400);expect(r.body.error.code).toBe('VALIDATION_ERROR');
  expect(db.prepare('SELECT count(*) AS n FROM profiles').get()).toEqual({n:0});
 });
 it.each([{avatarId:'https://evil.invalid/avatar'},{avatarId:'avatar-07'},{displayName:'Valid',role:'admin'},{displayName:'Valid',email:'fake@example.invalid'},{},[]])('rejects invalid avatars and unknown fields (%#)',async input=>{
  expect((await request(createApp({database:db})).patch('/api/profile').send(input)).status).toBe(400);
 });
 it('rejects oversized JSON payloads',async()=>{
  const r=await request(createApp({database:db})).patch('/api/profile').send({displayName:'x'.repeat(140000)});
  expect(r.status).toBe(413);expect(r.body.error.code).toBe('PAYLOAD_TOO_LARGE');
 });
 it('ignores ownership hints and never persists them',async()=>{
  const r=await request(createApp({database:db})).patch('/api/profile').send({displayName:'Local',userId:'other',user_id:'other',ownerId:'other'});
  expect(r.status).toBe(200);expect(db.prepare('SELECT user_id FROM profiles').all()).toEqual([{user_id:'local'}]);
 });
 it('non-destructive initialization preserves existing library and profile data',async()=>{
  db.prepare("INSERT INTO favorites(anilist_id,title) VALUES(1,'Preserved')").run();
  const repo=new SQLiteUserProfileRepository(db);await repo.updateProfile('local',{displayName:'Local Name'});
  initializeDatabase(db);initializeDatabase(db);
  expect(db.prepare('SELECT title FROM favorites').get()).toEqual({title:'Preserved'});
  expect((await repo.getProfile('local')).displayName).toBe('Local Name');
  await expect(repo.updateProfile('local',{avatarId:'invalid' as never})).rejects.toThrow();
 });
 it('uses the same Unicode character bounds in repository validation',async()=>{
  const repo=new SQLiteUserProfileRepository(db);const name='🌸'.repeat(40);
  expect((await repo.updateProfile('local',{displayName:name})).displayName).toBe(name);
  await expect(repo.updateProfile('local',{displayName:name+'🌸'})).rejects.toThrow();
 });
 it('requires authentication for GET and PATCH and derives cloud account fields only from verifier',async()=>{
  env.AUTH_MODE='supabase';const profiles=new Map<string,Profile>();const repositories=createUserRepositories(db);
  repositories.profile={getProfile:async id=>profiles.get(id)??defaultProfile(id),updateProfile:async(id,input)=>{const patch=profilePatchSchema.parse(input);const p={...(profiles.get(id)??defaultProfile(id)),...patch};profiles.set(id,p);return p;}};
  const app=createApp({database:db,repositories,tokenVerifier:async token=>token==='fixture-a'?{id:'a',email:'a@example.invalid',joinedAt:'2025-01-02T00:00:00.000Z'}:token==='fixture-b'?{id:'b'}:null});
  for(const method of ['get','patch'] as const){const r=await request(app)[method]('/api/profile');expect(r.status).toBe(401);expect(r.body.error.code).toBe('AUTH_REQUIRED');}
  const a=await request(app).patch('/api/profile').set('Authorization','Bearer fixture-a').send({displayName:'A',userId:'b'});
  expect(a.body.data).toMatchObject({mode:'cloud',email:'a@example.invalid',joinedAt:'2025-01-02T00:00:00.000Z'});
  expect(a.headers['cache-control']).toBe('no-store');expect(profiles.has('b')).toBe(false);
  const b=await request(app).get('/api/profile').set('Authorization','Bearer fixture-b');expect(b.body.data.displayName).toBe('Anime Explorer');expect(b.body.data.joinedAt).toBeNull();
  expect((await request(app).get('/api/profile/b').set('Authorization','Bearer fixture-a')).status).toBe(404);
  expect((await request(app).delete('/api/profile').set('Authorization','Bearer fixture-a')).status).toBe(404);
 });
});
