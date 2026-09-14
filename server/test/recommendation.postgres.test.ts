import Database from 'better-sqlite3';
import pg from 'pg';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migratePostgres } from '../src/database/migratePostgres.js';
import { initializeDatabase } from '../src/database/connection.js';
import { PostgresUserLibraryRepository, PostgresUserPlaybackRepository } from '../src/repositories/postgres.repositories.js';
import { SQLiteUserLibraryRepository, SQLiteUserPlaybackRepository } from '../src/repositories/sqlite.adapters.js';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { createApp } from '../src/app.js';
import { env } from '../src/utils/env.js';
import { HomeService } from '../src/services/home.service.js';
import { catalog, now, stamp } from './recommendation.fixtures.js';
describe.skipIf(!process.env.TEST_DATABASE_URL)('isolated PostgreSQL recommendation parity and A/B isolation', () => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL }), db = new Database(':memory:'), a = randomUUID(), b = randomUUID(), original = { ...env };
  const local = { library: new SQLiteUserLibraryRepository(db), playback: new SQLiteUserPlaybackRepository(db) }, cloud = { library: new PostgresUserLibraryRepository(pool), playback: new PostgresUserPlaybackRepository(pool) };
  const ls = new RecommendationService(catalog(), local, () => now), cs = new RecommendationService(catalog(), cloud, () => now); let app: ReturnType<typeof createApp>;
  beforeAll(async () => {
    initializeDatabase(db); await pool.query(readFileSync(new URL('./postgres-auth-fixture.sql', import.meta.url), 'utf8')); await migratePostgres(pool); await pool.query('INSERT INTO auth.users(id) VALUES($1),($2)', [a, b]);
    for (const [r, user] of [[local, 'local'], [cloud, a]] as const) { await r.library.saveFavorite(user, { anilistId: 1, title: 'Anime 1', genres: ['Action'] }); await r.library.saveWatchlist(user, { anilistId: 3, title: 'Anime 3', genres: ['Comedy'] }, 'COMPLETED'); await r.library.recordViewed(user, { anilistId: 4, title: 'Anime 4', genres: ['Action'] }); for (let n = 1; n <= 12; n++) await r.playback.saveProgress(user, { anilistId: 3, episodeNumber: n, totalEpisodes: 12, title: 'Anime 3', genres: ['Comedy'], currentTime: 100, duration: 100, completed: true }); }
    for (const [r, user] of [[local, 'local'], [cloud, a]] as const) await r.playback.saveHistory(user, { anilistId: 5, episodeNumber: 1, title: 'History only', genres: ['Comedy'], currentTime: 50, duration: 100, completed: false });
    await cloud.library.saveFavorite(b, { anilistId: 2, title: 'Anime 2', genres: ['Romance'] });
    for (const [table, column] of [['favorites', 'added_at'], ['watchlist', 'updated_at'], ['recently_viewed', 'last_viewed_at'], ['episode_progress', 'last_watched_at'], ['watch_history', 'watched_at']] as const) { db.prepare(`UPDATE ${table} SET ${column}=?`).run(stamp); await pool.query(`UPDATE ${table} SET ${column}=$1 WHERE user_id=ANY($2::uuid[])`, [stamp, [a, b]]); }
    Object.assign(env, { AUTH_MODE: 'supabase', DATABASE_MODE: 'postgres', NODE_ENV: 'test' }); app = createApp({ postgresPool: pool, repositories: cloud, animeService: catalog(), tokenVerifier: async t => [a, b].includes(t) ? { id: t } : null });
  }, 30000);
  afterAll(async () => { Object.assign(env, original); await pool.query('DELETE FROM auth.users WHERE id=ANY($1::uuid[])', [[a, b]]); await pool.end(); db.close(); });
  it('normalizes equivalent SQLite and PostgreSQL anime-level signals', async () => { expect(await cs.signals(a)).toEqual(await ls.signals('local')); });
  it('returns identical ranked IDs and reasons for equivalent stores', async () => { const l = await ls.getBundle('local'), p = await cs.getBundle(a); expect(p.recommendations).toEqual(l.recommendations); expect(p.continuations).toEqual(l.continuations); expect(p.because).toEqual(l.because); });
  it('keeps A and B taste and explanations isolated even with forged userId', async () => { const get = (id: string, extra = '') => request(app).get('/api/recommendations' + extra).auth(id, { type: 'bearer' }); const ar = await get(a), br = await get(b, '?userId=' + a); expect(ar.status).toBe(200); expect(br.status).toBe(200); expect(ar.headers['cache-control']).toBe('no-store'); expect(br.body.data[0].anime.id).toBe(102); expect(br.body.data[0].reason).toContain('Anime 2'); expect(br.body.data.some((r: { reason: string }) => r.reason.includes('Anime 1') || r.reason.includes('Comedy'))).toBe(false); expect(ar.body.data.some((r: { reason: string }) => r.reason.includes('Anime 2'))).toBe(false); });
  it('retains direct signal RLS under authenticated roles', async () => { await pool.query('GRANT SELECT ON favorites,watchlist,episode_progress,recently_viewed TO authenticated'); const c = await pool.connect(); try { await c.query('BEGIN'); await c.query('SET LOCAL ROLE authenticated'); await c.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [a]); for (const table of ['favorites', 'watchlist', 'episode_progress', 'recently_viewed']) expect((await c.query(`SELECT * FROM ${table} WHERE user_id=$1`, [b])).rowCount).toBe(0); } finally { await c.query('ROLLBACK'); c.release(); } });
  it('composes equivalent local/cloud Home sections from equivalent signals', async () => { const l = await new HomeService(local, ls).get('local'), p = await new HomeService(cloud, cs).get(a); expect(p.personalized).toEqual(l.personalized); expect(p.continueWatching?.data?.map(r => r.anilistId)).toEqual(l.continueWatching?.data?.map(r => r.anilistId)); expect(p.recentlyCompleted?.data?.map(r => r.anilistId)).toEqual(l.recentlyCompleted?.data?.map(r => r.anilistId)); });
  it('keeps Home bundle preferences/progress owner scoped and ignores forged ownership', async () => { const ar = await request(app).get('/api/home').auth(a, { type: 'bearer' }), br = await request(app).get('/api/home?userId=' + a).auth(b, { type: 'bearer' }); expect(ar.status).toBe(200); expect(br.status).toBe(200); expect(br.headers['cache-control']).toBe('no-store'); expect(br.body.data.recentlyCompleted.data).toHaveLength(0); expect(JSON.stringify(br.body.data.personalized)).not.toContain('favorite Anime 1'); expect(JSON.stringify(ar.body.data.personalized)).not.toContain('favorite Anime 2'); expect(br.body.data.personalized.data.audience).toBe('light'); });
});
