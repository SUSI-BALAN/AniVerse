// Run with node --import tsx scripts/benchmark-library.mjs; only in-memory SQLite and optional loopback test DB.
import Database from 'better-sqlite3';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
process.env.NODE_ENV='test';process.env.AUTH_MODE='local';process.env.DATABASE_MODE='sqlite';
const {initializeDatabase}=await import('../server/src/database/connection.ts');
const {createApp}=await import('../server/src/app.ts');
const {FavoritesRepository,WatchlistRepository,RecentlyViewedRepository}=await import('../server/src/repositories/localLibrary.repository.ts');
const db=new Database(':memory:');initializeDatabase(db);
const f=new FavoritesRepository(db),w=new WatchlistRepository(db),h=new RecentlyViewedRepository(db);
db.transaction(()=>{for(let i=1;i<=1000;i++){const anime={anilistId:i,title:`Fixture anime ${i}`,genres:['Action'],seasonYear:2020,averageScore:80};f.add(anime);w.add(anime,'PLANNING');if(i<=250)h.record(anime);}})();
const app=createApp({database:db});
async function measure(paths){let bytes=0;const start=performance.now();for(const path of paths){const r=await request(app).get(path);if(r.status!==200)throw Error('Benchmark endpoint failed.');bytes+=Buffer.byteLength(r.text);}return {requests:paths.length,bytes,elapsedMs:Number((performance.now()-start).toFixed(2))};}
const before=['/api/favorites','/api/watchlist','/api/history','/api/search-history','/api/settings'];
const bootstrap=['/api/library-membership','/api/search-history','/api/settings'];
const result={fixtures:{favorites:1000,watchlist:1000,recentlyViewed:250},note:'Measured API request graph from provider/page code; elapsed time is local, not a production benchmark.',before:{favorites:await measure(before),watchlist:await measure(before),history:await measure([...before,'/api/watch-history'])},after:{favorites:await measure([...bootstrap,'/api/library/favorites?pageSize=24']),watchlist:await measure([...bootstrap,'/api/library/watchlist?pageSize=24']),history:await measure([...bootstrap,'/api/library/watch-history?pageSize=24'])},page:{legacy:await measure(['/api/favorites']),paged:await measure(['/api/library/favorites?pageSize=24'])}};
db.close();
if(process.env.TEST_DATABASE_URL){const url=new URL(process.env.TEST_DATABASE_URL);if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/aniverse_stage10_2'))throw Error('Use only the isolated Stage 10.2 database.');const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});const id=randomUUID();try{
 await pool.query('INSERT INTO auth.users(id) VALUES($1)',[id]);await pool.query("INSERT INTO favorites(user_id,anilist_id,title,genres) SELECT $1,n,'Fixture '||n,'[\"Action\"]'::jsonb FROM generate_series(1,5000) n",[id]);await pool.query('ANALYZE favorites');
 const plan=(await pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT anilist_id,title FROM favorites WHERE user_id=$1 ORDER BY added_at DESC,anilist_id ASC LIMIT 24',[id])).rows[0]['QUERY PLAN'][0];const types=[];function walk(p){types.push(p['Node Type']);for(const child of p.Plans??[])walk(child);}walk(plan.Plan);result.postgres={ownedRows:5000,nodeTypes:types,executionMs:plan['Execution Time']};
}finally{await pool.query('DELETE FROM auth.users WHERE id=$1',[id]);await pool.end();}}
console.log(JSON.stringify(result,null,2));
