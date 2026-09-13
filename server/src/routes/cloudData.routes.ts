import { Router } from "express";
import type { Pool, PoolClient } from "pg";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/appError.js";
import { backupSchema, DATA_EXPORT_VERSION } from "./data.routes.js";

const tableKeys = {
  favorites: "favorites", watchlist: "watchlist", search_history: "searchHistory",
  recently_viewed: "recentlyViewed", episode_progress: "episodeProgress", watch_history: "watchHistory"
} as const;
const userId = (request: AuthenticatedRequest) => {
  if (!request.authUser) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
  return request.authUser.id;
};
const camel = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row)
  .filter(([key]) => key !== "user_id" && key !== "id" && key !== "normalized_query")
  .map(([key, value]) => [key === "current_time_seconds" ? "currentTime" : key.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase()), key === "average_score" && typeof value === "string" ? Number(value) : value]));
const date = (value: unknown) => typeof value === "string" ? value : null;
const genreJson = (value: unknown) => JSON.stringify(Array.isArray(value) ? value : []);

async function createExport(pool: Pool, owner: string) {
  const output: Record<string, unknown> = { app: "AniVerse", version: DATA_EXPORT_VERSION, exportedAt: new Date().toISOString() };
  for (const [table, key] of Object.entries(tableKeys)) {
    const rows = (await pool.query(`SELECT * FROM ${table} WHERE user_id=$1 ORDER BY id`, [owner])).rows as Record<string, unknown>[];
    output[key] = rows.map(camel);
  }
  const settings = (await pool.query("SELECT key,value FROM app_settings WHERE user_id=$1 ORDER BY key", [owner])).rows as Array<{ key: string; value: string }>;
  output.settings = Object.fromEntries(settings.map(({ key, value }) => [key, value]));
  return output;
}

async function mergeImport(client: PoolClient, owner: string, input: ReturnType<typeof backupSchema.parse>) {
  let duplicatesMerged=0;
  const upsert=async(sql:string,values:unknown[])=>{
    // Detect an actual unique-key conflict rather than guessing from input sizes
    // or querying another owner. A duplicate then follows the existing merge SQL.
    const insertOnly=sql.replace(/ DO UPDATE SET[\s\S]*$/," DO NOTHING RETURNING 1");
    const inserted=await client.query(insertOnly,values);
    if(inserted.rowCount===0){
      await client.query(sql,values);
      duplicatesMerged++;
    }
  };
  const saveSnapshot = async (table: "favorites" | "watchlist", item: (typeof input.favorites)[number], status?: string) => {
    const statusColumn = table === "watchlist" ? ",status" : "";
    const statusValue = table === "watchlist" ? ",$12" : "";
    const statusUpdate = table === "watchlist" ? ",status=excluded.status,updated_at=now()" : "";
    await upsert(`INSERT INTO ${table}(user_id,anilist_id,mal_id,title,title_romaji,cover_image,banner_image,format,season_year,average_score,genres${statusColumn}) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb${statusValue}) ON CONFLICT(user_id,anilist_id) DO UPDATE SET mal_id=excluded.mal_id,title=excluded.title,title_romaji=excluded.title_romaji,cover_image=excluded.cover_image,banner_image=excluded.banner_image,format=excluded.format,season_year=excluded.season_year,average_score=excluded.average_score,genres=excluded.genres${statusUpdate}`,
      [owner,item.anilistId,item.malId??null,item.title,item.titleRomaji??null,item.coverImage??null,item.bannerImage??null,item.format??null,item.seasonYear??null,item.averageScore??null,genreJson(item.genres),...(table === "watchlist" ? [status] : [])]);
  };
  for (const item of input.favorites) await saveSnapshot("favorites", item);
  for (const item of input.watchlist) await saveSnapshot("watchlist", item, item.status);
  for (const [key, value] of Object.entries(input.settings)) await upsert("INSERT INTO app_settings(user_id,key,value) VALUES($1,$2,$3) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=now()", [owner,key,value]);
  for (const item of input.searchHistory) await upsert("INSERT INTO search_history(user_id,query,normalized_query,searched_at) VALUES($1,$2::text,lower(trim($2::text)),coalesce($3::timestamptz,now())) ON CONFLICT(user_id,normalized_query) DO UPDATE SET query=excluded.query,searched_at=greatest(search_history.searched_at,excluded.searched_at)", [owner,item.query,date(item.searchedAt)]);
  for (const item of input.recentlyViewed) await upsert(`INSERT INTO recently_viewed(user_id,anilist_id,mal_id,title,title_romaji,cover_image,banner_image,format,season_year,average_score,genres,last_viewed_at,view_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,coalesce($12::timestamptz,now()),$13) ON CONFLICT(user_id,anilist_id) DO UPDATE SET mal_id=excluded.mal_id,title=excluded.title,title_romaji=excluded.title_romaji,cover_image=excluded.cover_image,banner_image=excluded.banner_image,format=excluded.format,season_year=excluded.season_year,average_score=excluded.average_score,genres=excluded.genres,last_viewed_at=greatest(recently_viewed.last_viewed_at,excluded.last_viewed_at),view_count=greatest(recently_viewed.view_count,excluded.view_count)`, [owner,item.anilistId,item.malId??null,item.title,item.titleRomaji??null,item.coverImage??null,item.bannerImage??null,item.format??null,item.seasonYear??null,item.averageScore??null,genreJson(item.genres),date(item.lastViewedAt),item.viewCount??1]);
  for (const item of input.episodeProgress) await upsert(`INSERT INTO episode_progress(user_id,anilist_id,mal_id,episode_number,total_episodes,title,cover_image,genres,current_time_seconds,duration,percentage,completed,provider_id,language,first_watched_at,last_watched_at,completed_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,coalesce($15::timestamptz,now()),coalesce($16::timestamptz,now()),$17::timestamptz,coalesce($18::timestamptz,now()),coalesce($19::timestamptz,now())) ON CONFLICT(user_id,anilist_id,episode_number) DO UPDATE SET total_episodes=excluded.total_episodes,title=excluded.title,cover_image=excluded.cover_image,genres=excluded.genres,current_time_seconds=excluded.current_time_seconds,duration=excluded.duration,percentage=excluded.percentage,completed=episode_progress.completed OR excluded.completed,provider_id=excluded.provider_id,language=excluded.language,last_watched_at=greatest(episode_progress.last_watched_at,excluded.last_watched_at),completed_at=coalesce(episode_progress.completed_at,excluded.completed_at),updated_at=greatest(episode_progress.updated_at,excluded.updated_at)`, [owner,item.anilistId,item.malId??null,item.episodeNumber,item.totalEpisodes??null,item.title,item.coverImage??null,genreJson(item.genres),item.currentTime,item.duration,item.currentTime/item.duration*100,item.completed,item.providerId??null,item.language??null,date(item.firstWatchedAt),date(item.lastWatchedAt),date(item.completedAt),date(item.createdAt),date(item.updatedAt)]);
  for (const item of input.watchHistory) await upsert(`INSERT INTO watch_history(user_id,anilist_id,mal_id,episode_number,total_episodes,title,cover_image,genres,progress_percentage,completed,provider_id,language,watched_at,updated_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,coalesce($13::timestamptz,now()),coalesce($14::timestamptz,now()),coalesce($15::timestamptz,now())) ON CONFLICT(user_id,anilist_id,episode_number) DO UPDATE SET progress_percentage=greatest(watch_history.progress_percentage,excluded.progress_percentage),completed=watch_history.completed OR excluded.completed,watched_at=greatest(watch_history.watched_at,excluded.watched_at),updated_at=greatest(watch_history.updated_at,excluded.updated_at)`, [owner,item.anilistId,item.malId??null,item.episodeNumber,item.totalEpisodes??null,item.title,item.coverImage??null,genreJson(item.genres),item.progressPercentage,item.completed,item.providerId??null,item.language??null,date(item.watchedAt),date(item.updatedAt),date(item.createdAt)]);
  return duplicatesMerged;
}

export function createCloudDataRouter(pool: Pool) {
  const router = Router();
  router.get("/data/export", async (request: AuthenticatedRequest, response, next) => { try { response.setHeader("Content-Disposition", "attachment; filename=aniverse-backup.json"); response.json(await createExport(pool, userId(request))); } catch (error) { next(error); } });
  router.post("/data/import", async (request: AuthenticatedRequest, response, next) => {
    let client: PoolClient | undefined;
    try {
      const input=backupSchema.parse(request.body);
      const owner=userId(request);
      client=await pool.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 91739001))", [owner]);
      const duplicatesMerged=await mergeImport(client,owner,input);
      await client.query("COMMIT");
      response.json({success:true,data:{imported:true,favoritesImported:input.favorites.length,watchlistImported:input.watchlist.length,settingsImported:Object.keys(input.settings).length,progressImported:input.episodeProgress.length,historyImported:input.watchHistory.length,duplicatesMerged,errors:[]}});
    } catch(error) {
      if (client) await client.query("ROLLBACK").catch(() => undefined);
      next(error);
    } finally { client?.release(); }
  });
  router.delete("/data/reset/:target", async (request: AuthenticatedRequest, response, next) => { const targets:Record<string,string[]>={"search-history":["search_history"],"recently-viewed":["recently_viewed"],"watch-history":["watch_history"],progress:["episode_progress"],favorites:["favorites"],watchlist:["watchlist"],all:[...Object.keys(tableKeys),"app_settings"]}; const selected=targets[String(request.params.target)]; if(!selected)return next(new AppError(400,"VALIDATION_ERROR","Unknown reset target.")); const client=await pool.connect(); try { await client.query("BEGIN"); let removed=0; for(const table of selected)removed+=(await client.query(`DELETE FROM ${table} WHERE user_id=$1`,[userId(request)])).rowCount??0; await client.query("COMMIT"); response.json({success:true,data:{removed}}); } catch(error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); } });
  return router;
}
