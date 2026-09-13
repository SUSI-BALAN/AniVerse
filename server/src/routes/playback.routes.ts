import { Router } from "express";
import { z } from "zod";
import type Database from "better-sqlite3";
import { PlaybackRepository } from "../repositories/playback.repository.js";
import { AppError } from "../utils/appError.js";

const id = z.coerce.number().int().positive();
const episode = z.coerce.number().int().positive().max(10000);
const body = z.object({ currentTime: z.number().finite().min(0).max(1e7), duration: z.number().finite().positive().max(1e7), providerId: z.enum(["cinextream", "yenime", "zokoanime"]).nullable().optional(), language: z.enum(["sub", "dub"]).nullable().optional(), title: z.string().trim().min(1).max(240), coverImage: z.string().url().max(2000).nullable().optional(), genres: z.array(z.string().trim().max(40)).max(30).optional(), malId: z.number().int().positive().nullable().optional(), completed: z.boolean().optional() });

export function createPlaybackRouter(db: Database.Database) {
  const router = Router(); const repository = new PlaybackRepository(db);
  router.get("/progress/continue-watching", (req, res) => res.json({ success: true, data: repository.continueWatching(req.query.limit ? Number(req.query.limit) : 20) }));
  router.get("/progress/recently-completed", (req, res) => res.json({ success: true, data: repository.recentlyCompleted(req.query.limit ? Number(req.query.limit) : 20) }));
  router.get("/progress/:animeId", (req, res) => res.json({ success: true, data: repository.getAnime(id.parse(req.params.animeId)) }));
  router.get("/progress/:animeId/:episode", (req, res) => res.json({ success: true, data: repository.getEpisode(id.parse(req.params.animeId), episode.parse(req.params.episode)) }));
  router.put("/progress/:animeId/:episode", (req, res) => { const anilistId = id.parse(req.params.animeId); const episodeNumber = episode.parse(req.params.episode); const input = body.parse(req.body); if (input.currentTime > input.duration + 5) throw new AppError(400, "INVALID_PROGRESS", "Playback progress is invalid."); const percentage = input.currentTime / input.duration * 100; const completed = Boolean(input.completed || percentage >= 92); const saved = repository.upsert({ ...input, anilistId, episodeNumber, completed }); if (input.currentTime >= 30 || percentage >= 5 || completed) repository.recordHistory({ ...input, anilistId, episodeNumber, completed }); return res.json({ success: true, data: saved }); });
  router.delete("/progress/:animeId/:episode", (req, res) => res.json({ success: true, data: { removed: repository.removeEpisode(id.parse(req.params.animeId), episode.parse(req.params.episode)) } }));
  router.delete("/progress/:animeId", (req, res) => res.json({ success: true, data: { removed: repository.removeAnime(id.parse(req.params.animeId)) } }));
  router.get("/watch-history", (req, res) => res.json({ success: true, data: repository.getHistory(req.query.limit ? Number(req.query.limit) : 100) }));
  router.delete("/watch-history/:id", (req, res) => res.json({ success: true, data: { removed: repository.removeHistory(id.parse(req.params.id)) } }));
  router.delete("/watch-history", (_req, res) => res.json({ success: true, data: { removed: repository.clearHistory() } }));
  router.post("/watch-history", (req, res) => { const input = body.parse(req.body); const anilistId = id.parse(req.body.anilistId); const episodeNumber = episode.parse(req.body.episodeNumber); return res.status(201).json({ success: true, data: repository.recordHistory({ ...input, anilistId, episodeNumber, completed: Boolean(input.completed) }) }); });
  return router;
}
