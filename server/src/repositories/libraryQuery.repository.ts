import type Database from 'better-sqlite3';
import type {Pool} from 'pg';
import {z} from 'zod';
import {WATCHLIST_STATUSES} from '../types/library.types.js';

export const collections = ['favorites','watchlist','recently-viewed','watch-history','continue-watching','recently-completed'] as const;
export type LibraryCollection = typeof collections[number];
export const libraryQuerySchema = z.object({
  search:z.string().trim().max(100).refine(v=>!/[\u0000-\u001f\u007f]/u.test(v)).default(''),
  genre:z.string().trim().max(40).default(''),
  status:z.enum(WATCHLIST_STATUSES).optional(),
  sort:z.enum(['date','title','score','year']).default('date'),
  direction:z.enum(['asc','desc']).default('desc'),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().refine(v=>[12,24,48].includes(v),'Page size must be 12, 24 or 48.').default(24)
}).strict();
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type LibraryPage = {items:Record<string,unknown>[];page:number;pageSize:number;total:number;totalPages:number;genres:string[]};
export type LibraryMembership={favoriteIds:number[];watchlist:{anilistId:number;status:string}[];recentlyViewedCount:number};
export interface LibraryQueryRepository {membership(userId:string):Promise<LibraryMembership>;list(userId:string,collection:LibraryCollection,query:LibraryQuery):Promise<LibraryPage>}

// Every identifier below is selected from a closed server-side map. Values are bound parameters.
const tables:Record<LibraryCollection,string> = {'favorites':'favorites','watchlist':'watchlist','recently-viewed':'recently_viewed','watch-history':'watch_history','continue-watching':'episode_progress','recently-completed':'episode_progress'};
function build(userId:string,collection:LibraryCollection,q:LibraryQuery,postgres:boolean) {
  const lower=(column:string)=>postgres?`LOWER(${column} COLLATE "unicode")`:`library_lower(${column})`;
  const table=tables[collection], progress=table==='episode_progress', history=table==='watch_history';
  const values:unknown[]=[];
  const bind=(v:unknown)=>{values.push(v);return postgres?`$${values.length}`:'?';};
  const where:string[]=[];
  if(postgres)where.push(`t.user_id=${bind(userId)}`);
  if(collection==='continue-watching')where.push(`t.completed=${postgres?'false':'0'} AND t.${postgres?'current_time_seconds':'current_time'}>=30 AND t.duration>0`);
  if(collection==='recently-completed')where.push(`t.completed=${postgres?'true':'1'} AND t.total_episodes>0 AND t.episode_number=t.total_episodes AND (SELECT COUNT(*) FROM episode_progress p WHERE p.anilist_id=t.anilist_id ${postgres?'AND p.user_id=t.user_id':''} AND p.completed=${postgres?'true':'1'})>=t.total_episodes`);
  const base=[...where],baseValues=[...values];
  if(q.search){const pattern='%'+q.search.toLowerCase().replace(/[\\%_]/g,'\\$&')+'%';where.push(`(${lower('t.title')} LIKE ${bind(pattern)} ESCAPE '\\' ${!progress&&!history?`OR ${lower('t.title_romaji')} LIKE ${bind(pattern)} ESCAPE '\\'`:''})`);}
  if(q.genre)where.push(postgres?`EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(t.genres,'[]'::jsonb)) g(value) WHERE ${lower('g.value')}=${bind(q.genre.toLowerCase())})`:`EXISTS (SELECT 1 FROM json_each(COALESCE(t.genres,'[]')) g WHERE ${lower('g.value')}=${bind(q.genre.toLowerCase())})`);
  if(q.status)where.push(`t.status=${bind(q.status)}`);
  const date=collection==='favorites'?'t.added_at':collection==='watchlist'?'t.updated_at':collection==='recently-viewed'?'t.last_viewed_at':history?'t.watched_at':collection==='recently-completed'?'COALESCE(t.completed_at,t.updated_at)':'COALESCE(t.last_watched_at,t.updated_at)';
  const sort=q.sort==='title'?`${lower('t.title')}${postgres?' COLLATE "C"':''}`:q.sort==='score'?'t.average_score':q.sort==='year'?'t.season_year':date;
  const nullable=q.sort==='score'||q.sort==='year';
  const order=`${nullable?`${sort} IS NULL ASC, `:''}${sort} ${q.direction.toUpperCase()}, t.anilist_id ASC${progress?', t.episode_number ASC':', t.id ASC'}`;
  const condition=where.length?' WHERE '+where.join(' AND '):'';
  const snapshot=`t.anilist_id AS "anilistId",t.mal_id AS "malId",t.title,t.cover_image AS "coverImage",t.genres`;
  const select=progress?`${snapshot},t.episode_number AS "episodeNumber",t.total_episodes AS "totalEpisodes",t.${postgres?'current_time_seconds':'current_time'} AS "currentTime",t.duration,t.percentage,t.completed,${date} AS "lastWatchedAt"`:history?`${snapshot},t.id,t.episode_number AS "episodeNumber",t.progress_percentage AS "percentage",t.completed,t.watched_at AS "watchedAt"`:`${snapshot},t.id,t.title_romaji AS "titleRomaji",t.banner_image AS "bannerImage",t.format,t.season_year AS "seasonYear",t.average_score AS "averageScore",${date} AS "date"${collection==='watchlist'?',t.status':collection==='recently-viewed'?',t.view_count AS "viewCount"':''}`;
  return {table,select,condition,order,values,base,baseValues,bind};
}
function normalize(row:Record<string,unknown>) {const result:Record<string,unknown>={malId:null,titleRomaji:null,bannerImage:null,format:null,seasonYear:null,averageScore:null,...row};for(const[key,value]of Object.entries(result)){if(value instanceof Date)result[key]=value.toISOString();else if(typeof value==='string'&&['date','watchedAt','lastWatchedAt'].includes(key))result[key]=new Date(value.includes('T')?value:value.replace(' ','T')+'Z').toISOString();}if(result.averageScore!=null)result.averageScore=Number(result.averageScore);result.genres=typeof result.genres==='string'?JSON.parse(result.genres):result.genres??[];if('completed'in result)result.completed=Boolean(result.completed);return result;}
export class SQLiteLibraryQueryRepository implements LibraryQueryRepository {
  constructor(private db:Database.Database){db.function('library_lower',{deterministic:true},value=>String(value??'').toLowerCase());}
  async membership(_userId:string):Promise<LibraryMembership>{return {favoriteIds:(this.db.prepare('SELECT anilist_id id FROM favorites').all() as {id:number}[]).map(x=>x.id),watchlist:this.db.prepare('SELECT anilist_id AS anilistId,status FROM watchlist').all() as LibraryMembership['watchlist'],recentlyViewedCount:Number((this.db.prepare('SELECT COUNT(*) total FROM recently_viewed').get() as {total:number}).total)};}
  async list(userId:string,c:LibraryCollection,q:LibraryQuery):Promise<LibraryPage>{
    return this.db.transaction(()=>{const b=build(userId,c,q,false);const total=Number((this.db.prepare(`SELECT COUNT(*) total FROM ${b.table} t${b.condition}`).get(...b.values) as {total:number}).total);
      const items=this.db.prepare(`SELECT ${b.select} FROM ${b.table} t${b.condition} ORDER BY ${b.order} LIMIT ? OFFSET ?`).all(...b.values,q.pageSize,(q.page-1)*q.pageSize) as Record<string,unknown>[];
      const genres=this.db.prepare(`SELECT DISTINCT g.value genre FROM ${b.table} t,json_each(COALESCE(t.genres,'[]')) g${b.base.length?' WHERE '+b.base.join(' AND '):''} ORDER BY g.value LIMIT 100`).all(...b.baseValues) as {genre:string}[];
      return {items:items.map(normalize),page:q.page,pageSize:q.pageSize,total,totalPages:Math.ceil(total/q.pageSize),genres:genres.map(g=>g.genre).sort((a:string,b:string)=>a.toLowerCase()<b.toLowerCase()?-1:a.toLowerCase()>b.toLowerCase()?1:a<b?-1:a>b?1:0)};
    })();
  }
}
export class PostgresLibraryQueryRepository implements LibraryQueryRepository {
  constructor(private pool:Pool){}
  async membership(userId:string):Promise<LibraryMembership>{const [f,w,h]=await Promise.all([this.pool.query('SELECT anilist_id id FROM favorites WHERE user_id=$1',[userId]),this.pool.query('SELECT anilist_id AS "anilistId",status FROM watchlist WHERE user_id=$1',[userId]),this.pool.query('SELECT COUNT(*) total FROM recently_viewed WHERE user_id=$1',[userId])]);return {favoriteIds:f.rows.map(x=>x.id),watchlist:w.rows,recentlyViewedCount:Number(h.rows[0].total)};}
  async list(userId:string,c:LibraryCollection,q:LibraryQuery):Promise<LibraryPage>{
    const client=await this.pool.connect();
    try {await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const b=build(userId,c,q,true);
      const total=Number((await client.query(`SELECT COUNT(*) total FROM ${b.table} t${b.condition}`,b.values)).rows[0].total);
      const paging=[...b.values,q.pageSize,(q.page-1)*q.pageSize];
      const items=(await client.query(`SELECT ${b.select} FROM ${b.table} t${b.condition} ORDER BY ${b.order} LIMIT $${paging.length-1} OFFSET $${paging.length}`,paging)).rows;
      const genres=(await client.query(`SELECT genre FROM (SELECT DISTINCT g.value genre FROM ${b.table} t CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(t.genres,'[]'::jsonb)) g(value) WHERE ${b.base.join(' AND ')}) facets ORDER BY genre COLLATE "C" LIMIT 100`,b.baseValues)).rows;
      await client.query('COMMIT');return {items:items.map(normalize),page:q.page,pageSize:q.pageSize,total,totalPages:Math.ceil(total/q.pageSize),genres:genres.map(g=>g.genre).sort((a:string,b:string)=>a.toLowerCase()<b.toLowerCase()?-1:a.toLowerCase()>b.toLowerCase()?1:a<b?-1:a>b?1:0)};
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
}
