import Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { initializeDatabase } from '../src/database/connection.js';
import { AniListService } from '../src/services/anilist.service.js';
import { env } from '../src/utils/env.js';
import { logEvent, normalizeRoute, redact, setObservabilitySinkForTests } from '../src/utils/observability.js';
import { observeRepository } from '../src/repositories/repositoryFactory.js';
import { AppError } from '../src/utils/appError.js';
import express from 'express';
import { requestContext } from '../src/middleware/requestContext.js';
import { createApiRateLimit } from '../src/middleware/rateLimits.js';
import { createUserRepositories } from '../src/repositories/repositoryFactory.js';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { HomeService } from '../src/services/home.service.js';
import { catalog, favorite, now } from './recommendation.fixtures.js';

const lines:string[]=[];
const original={...env};
beforeEach(()=>{env.AUTH_MODE='local';env.DATABASE_MODE='sqlite';});
afterEach(()=>{setObservabilitySinkForTests(null);lines.length=0;Object.assign(env,original);});
const capture=()=>setObservabilitySinkForTests(line=>lines.push(line));

describe('privacy-safe production observability',()=>{
  it('redacts nested secrets and neutralizes log injection as one JSON event',()=>{
    const fake={Authorization:'Bearer fake-auth',Cookie:'fake-cookie',password:'fake-password',access_token:'fake-access',nested:{refresh_token:'fake-refresh',DATABASE_URL:'fake-db',token:'fake-token'},safe:'line one\nFAKE level=error\u0000'};
    const output=JSON.stringify(redact(fake));
    for(const secret of ['fake-auth','fake-cookie','fake-password','fake-access','fake-refresh','fake-db','fake-token'])expect(output).not.toContain(secret);
    expect(output).not.toContain('\n');expect(()=>JSON.parse(output)).not.toThrow();
  });
  it('generates or validates bounded request IDs, returns them and logs one normalized completion',async()=>{
    capture();const db=new Database(':memory:');initializeDatabase(db);const app=createApp({database:db,animeService:{details:async()=>{throw new AppError(404,'ANIME_NOT_FOUND','Not found.');}} as never});
    const generated=await request(app).get('/api/anime/123456');
    expect(generated.headers['x-request-id']).toMatch(/^[a-zA-Z0-9._-]{1,64}$/);
    const supplied=await request(app).get('/api/health').set('X-Request-ID','safe-reference_1');
    expect(supplied.headers['x-request-id']).toBe('safe-reference_1');
    const rejected=await request(app).get('/api/health').set('X-Request-ID','x'.repeat(65));expect(rejected.headers['x-request-id']).not.toBe('x'.repeat(65));
    const records=lines.map(line=>JSON.parse(line));
    expect(records.filter(record=>record.event==='request.completed')).toHaveLength(3);
    expect(records[0]).toMatchObject({event:'request.completed',route:'/api/anime/:id',requestId:generated.headers['x-request-id'],status:404,durationMs:expect.any(Number),authenticated:false});
    db.close();
  });
  it('logs safe validation fields and database failures without values or rows',async()=>{
    capture();const db=new Database(':memory:');initializeDatabase(db);const app=createApp({database:db});
    await request(app).get('/api/anime/search?q=x&page=private-value');
    const failing=observeRepository({load:async(_privateValue:string)=>{throw new Error('row title private-value');}},'fixture');
    await expect(failing.load('private-value')).rejects.toThrow();
    const output=lines.join('\n');expect(output).toContain('validation.failed');expect(output).toContain('invalidFields');expect(output).toContain('database.failed');expect(output).not.toContain('row title private-value');expect(output).not.toContain('q=x');
    db.close();
  });
  it('logs unexpected request failures and rate limits with correlation but no payload',async()=>{
    capture();const db=new Database(':memory:');initializeDatabase(db);const repositories=createUserRepositories(db);repositories.library.favorites=async()=>{throw new Error('private favorite title');};
    const failed=await request(createApp({database:db,repositories})).get('/api/favorites').set('X-Request-ID','failure-ref');expect(failed.status).toBe(500);
    const limited=express();limited.use(requestContext);limited.use(createApiRateLimit(1));limited.get('/api/test/:id',(_req,res)=>res.json({ok:true}));await request(limited).get('/api/test/1');await request(limited).get('/api/test/2');
    const output=lines.join('\n');expect(output).toContain('request.failed');expect(output).toContain('failure-ref');expect(output).toContain('rate_limit');expect(output).not.toContain('private favorite title');db.close();
  });
  it('records slow database operation metadata without machine-specific assertions',async()=>{
    capture();const previous=env.OBSERVABILITY_SLOW_MS;env.OBSERVABILITY_SLOW_MS=10;
    try{const repository=observeRepository({load:async(_value:string)=>{await new Promise(resolve=>setTimeout(resolve,15));return [{private:'row'}];}},'fixture');await repository.load('private-input');const event=lines.map(JSON.parse).find(record=>record.event==='database.slow');expect(event).toMatchObject({operation:'fixture.load',durationMs:expect.any(Number),success:true});expect(lines.join()).not.toMatch(/private-input|"private":"row"/);}finally{env.OBSERVABILITY_SLOW_MS=previous;}
  });
  it('records safe AniList cache, coalescing, timing and 429 events without search text',async()=>{
    capture();const cache={get:vi.fn(()=>null),set:vi.fn(),delete:vi.fn(),deleteExpired:vi.fn()};
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    const fetcher=vi.fn(async()=>{await gate;return new Response(JSON.stringify({data:{Page:{media:[]}}}),{status:200});});
    const service=new AniListService(cache as never,fetcher);const a=service.search('private-search-text',1,20),b=service.search('private-search-text',1,20);release();await Promise.all([a,b]);
    expect(service.getMetrics()).toMatchObject({coalesced:1});expect(lines.join()).toContain('anilist.coalesced');expect(lines.join()).toContain('dependency.completed');expect(lines.join()).not.toContain('private-search-text');
    lines.length=0;const limited=new AniListService(cache as never,vi.fn(async()=>new Response(JSON.stringify({errors:[{}]}),{status:429,headers:{'Retry-After':'3'}})));await expect(limited.search('another-private-query',1,20)).rejects.toMatchObject({code:'ANILIST_UNAVAILABLE'});expect(lines.join()).toContain('anilist.rate_limit');expect(lines.join()).toContain('"retryAfter":3');expect(lines.join()).not.toContain('another-private-query');
  });
  it('normalizes routes without query strings or high-cardinality IDs',()=>expect(normalizeRoute('/api/watch/123/4?q=private')).toBe('/api/watch/:id/:id'));
  it('records Home and recommendation counts without private titles or records',async()=>{capture();const db=new Database(':memory:');initializeDatabase(db);const repositories=createUserRepositories(db);await repositories.library.saveFavorite('local',favorite(1));const recommendations=new RecommendationService(catalog(),repositories,()=>now);const home=new HomeService(repositories,recommendations);await home.get('local');const output=lines.join('\n');expect(output).toContain('recommendation.completed');expect(output).toContain('candidateCount');expect(output).toContain('resultCount');expect(output).toContain('home.completed');expect(output).toContain('sectionCount');expect(output).not.toContain('Anime 1');db.close();});
  it('keeps startup configuration logs secret-safe',()=>{capture();logEvent('info','startup.completed',{environment:'production',databaseMode:'postgres',authMode:'supabase',port:4000,DATABASE_URL:'fake-db-secret',SUPABASE_ANON_KEY:'fake-key-secret'});expect(lines[0]).not.toMatch(/fake-db-secret|fake-key-secret/);});
  it('keeps structured logging overhead and payload size bounded',()=>{capture();const started=performance.now();for(let index=0;index<1000;index++)logEvent('info','request.completed',{route:'/api/anime/:id',status:200,durationMs:4});const durationMs=performance.now()-started,averageBytes=lines.reduce((sum,line)=>sum+Buffer.byteLength(line),0)/lines.length;console.info('OBSERVABILITY_OVERHEAD',JSON.stringify({events:lines.length,durationMs:Number(durationMs.toFixed(2)),averageBytes:Number(averageBytes.toFixed(1))}));expect(lines).toHaveLength(1000);expect(averageBytes).toBeLessThan(512);});
});
