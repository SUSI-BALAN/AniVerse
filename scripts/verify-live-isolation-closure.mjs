// Only the three previously failed live gates. No signup, migrations, or RLS audit.
import fs from 'node:fs';
import path from 'node:path';
import {randomInt,randomUUID} from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
const root=path.resolve(import.meta.dirname,'..');
const e=dotenv.parse(fs.readFileSync(path.join(root,'server/.env')));
if(e.RUN_LIVE_SUPABASE_TESTS!=='true')throw new Error('Live closure verification disabled.');
const marker=`AV9-CLOSURE-${randomUUID()}`,ids=[randomInt(1000000000,2000000000),randomInt(1000000000,2000000000),randomInt(1000000000,2000000000)];
const base=e.SMOKE_API_BASE_URL||`http://127.0.0.1:${e.PORT||4000}`;
const sessions=[],gates={},counts={};
const pool=new pg.Pool({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:fs.readFileSync(path.resolve(root,'server',e.DATABASE_CA_CERT_PATH),'utf8')},connectionTimeoutMillis:10000,max:1});
const tables=['favorites','watchlist','recently_viewed','episode_progress','watch_history'];
function record(name,pass){gates[name]=pass?'PASS':'FAIL';console.log(`${name}: ${gates[name]}`);}
async function request(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});let body;try{body=await r.json();}catch{body=null;}return{status:r.status,ok:r.ok,body};}
async function api(i,route,method='GET',body){return request(`${base}/api${route}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessions[i].token}`},...(body?{body:JSON.stringify(body)}:{})});}
function backup(id){const anime={anilistId:id,title:`${marker}-${id}`,genres:['Fantasy']};return{app:'AniVerse',version:1,favorites:[anime],watchlist:[{...anime,status:'PLANNING'}],settings:{},searchHistory:[{query:`${marker}-${id}`}],recentlyViewed:[{...anime,viewCount:2}],episodeProgress:[{...anime,episodeNumber:1,currentTime:60,duration:120,completed:false}],watchHistory:[{...anime,episodeNumber:1,progressPercentage:50,completed:false}]};}
try{
  // Obtain fresh sign-in credentials solely to exercise these three routes.
  for(const suffix of ['','_B']){const r=await request(new URL('/auth/v1/token?grant_type=password',e.SUPABASE_URL),{method:'POST',headers:{apikey:e.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:e[`LIVE_TEST_EMAIL${suffix}`],password:e[`LIVE_TEST_PASSWORD${suffix}`]})});if(!r.ok||!r.body?.access_token||!r.body?.user?.id)throw Error('SIGN_IN_UNAVAILABLE');sessions.push({id:r.body.user.id,token:r.body.access_token});}
  if(sessions[0].id===sessions[1].id)throw Error('IDENTITY_PREREQUISITE');
  for(const table of tables){const r=await pool.query(`SELECT 1 FROM ${table} WHERE anilist_id=ANY($1::int[]) LIMIT 1`,[ids]);if(r.rowCount)throw Error('FIXTURE_COLLISION');}
  const create=await api(0,'/favorites','POST',{anilistId:ids[0],title:`${marker}-read-delete`});if(!create.ok)throw Error('FIXTURE_CREATE');
  const read=await api(1,`/favorites/${ids[0]}`),unknownRead=await api(1,`/favorites/${ids[2]}`),ownerRead=await api(0,`/favorites/${ids[0]}`);
  record('Remote cross-user read',read.status===404&&read.body?.error?.code==='RESOURCE_NOT_FOUND'&&ownerRead.ok);
  record('Remote nonexistent read',unknownRead.status===404&&unknownRead.body?.error?.code==='RESOURCE_NOT_FOUND'&&unknownRead.body.error.message===read.body.error.message);
  // Deletion exercises the DELETE handler; collection and GET paths are separate.
  const foreignDelete=await api(1,`/favorites/${ids[0]}`,'DELETE'),unknownDelete=await api(1,`/favorites/${ids[2]}`,'DELETE');
  const preserved=await api(0,`/favorites/${ids[0]}`);
  record('Remote cross-user delete',foreignDelete.status===404&&foreignDelete.body?.error?.code==='RESOURCE_NOT_FOUND'&&preserved.ok);
  record('Remote nonexistent delete',unknownDelete.status===404&&unknownDelete.body?.error?.code==='RESOURCE_NOT_FOUND'&&unknownDelete.body.error.message===foreignDelete.body.error.message);
  record('User A row preservation',preserved.ok&&preserved.body?.data?.anilistId===ids[0]);
  const ownerDelete=await api(0,`/favorites/${ids[0]}`,'DELETE'),after=await api(0,`/favorites/${ids[0]}`);record('Remote valid owner delete',ownerDelete.ok&&ownerDelete.body?.data?.removed===true&&after.status===404);
  const initial=await api(0,'/data/import','POST',backup(ids[1]));
  const duplicate=await api(0,'/data/import','POST',backup(ids[1]));
  const mixed=backup(ids[1]),fresh=backup(ids[2]);for(const key of ['favorites','watchlist','searchHistory','recentlyViewed','episodeProgress','watchHistory'])mixed[key].push(...fresh[key]);
  const mixture=await api(0,'/data/import','POST',mixed);counts.initial=initial.body?.data?.duplicatesMerged;counts.duplicate=duplicate.body?.data?.duplicatesMerged;counts.mixed=mixture.body?.data?.duplicatesMerged;
  let persistence=true;for(const table of tables){const r=await pool.query(`SELECT user_id,anilist_id FROM ${table} WHERE anilist_id=ANY($1::int[])`,[[ids[1],ids[2]]]);persistence=persistence&&r.rows.length===2&&r.rows.every(x=>x.user_id===sessions[0].id);}
  const searches=await pool.query('SELECT user_id FROM search_history WHERE query=ANY($1::text[])',[[`${marker}-${ids[1]}`,`${marker}-${ids[2]}`]]);persistence=persistence&&searches.rowCount===2&&searches.rows.every(x=>x.user_id===sessions[0].id);
  record('Remote duplicate summary',initial.ok&&duplicate.ok&&mixture.ok&&counts.initial===0&&counts.duplicate===6&&counts.mixed===6&&persistence);
  console.log(`DUPLICATES MERGED: initial=${counts.initial??'FAIL'}, duplicate=${counts.duplicate??'FAIL'}, mixed=${counts.mixed??'FAIL'}`);
}catch{record('Remote closure prerequisite',false);}
finally{
  try{for(const s of sessions){for(const table of tables)await pool.query(`DELETE FROM ${table} WHERE user_id=$1 AND anilist_id=ANY($2::int[]) AND title LIKE $3`,[s.id,ids,`${marker}%`]);await pool.query('DELETE FROM search_history WHERE user_id=$1 AND query LIKE $2',[s.id,`${marker}%`]);await request(new URL('/auth/v1/logout?scope=local',e.SUPABASE_URL),{method:'POST',headers:{apikey:e.SUPABASE_ANON_KEY,Authorization:`Bearer ${s.token}`}});}record('Closure cleanup',true);}catch{record('Closure cleanup',false);}await pool.end();
  fs.writeFileSync(path.join(root,'docs/PHASE9_ISOLATION_CLOSURE_RESULTS.json'),JSON.stringify({verifiedAt:new Date().toISOString(),gates,counts},null,2)+'\n');process.exitCode=Object.values(gates).every(v=>v==='PASS')&&gates['Remote duplicate summary']==='PASS'?0:1;
}
