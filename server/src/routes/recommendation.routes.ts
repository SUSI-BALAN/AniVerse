import { pageLimit, validateSetting } from "../utils/validation.js";
import { Router } from "express";
import type Database from "better-sqlite3";
import { AniListService, type AnimeListServiceContract } from "../services/anilist.service.js";
import { RecommendationService } from "../services/recommendation.service.js";
export function createRecommendationRouter(db: Database.Database, service: AnimeListServiceContract = new AniListService()) { const router = Router(); const recommendations = new RecommendationService(service, db); router.get("/recommendations", async (req, res, next) => { try { const limit = Math.min(pageLimit.parse(req.query.limit??12),20); res.json({ success: true, data: await recommendations.getRecommendations(limit) }); } catch (error) { next(error); } }); router.get("/recommendations/because-you-watched", async (req, res, next) => { try { const limit = Math.min(pageLimit.parse(req.query.limit??12),20); res.json({ success: true, data: await recommendations.getBecauseYouWatched(limit) }); } catch (error) { next(error); } }); return router; }
