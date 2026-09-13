import { pageLimit, validateSetting } from "../utils/validation.js";
import { Router, type NextFunction, type Response } from "express";
import { z } from "zod";
import type { UserLibraryRepository } from "../repositories/repository.contracts.js";
import { WATCHLIST_STATUSES } from "../repositories/localLibrary.repository.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/appError.js";

const id=z.coerce.number().int().positive();
const snapshot=z.object({anilistId:id,malId:z.number().int().positive().nullable().optional(),title:z.string().trim().min(1).max(240),titleRomaji:z.string().trim().max(240).nullable().optional(),coverImage:z.string().url().max(2000).nullable().optional(),bannerImage:z.string().url().max(2000).nullable().optional(),format:z.string().trim().max(30).nullable().optional(),seasonYear:z.number().int().min(1900).max(3000).nullable().optional(),averageScore:z.number().min(0).max(100).nullable().optional(),genres:z.array(z.string().trim().min(1).max(40)).max(30).optional()});
const status=z.enum(WATCHLIST_STATUSES);
const settingKey=z.enum(["theme","title_preference","reduced_motion","show_adult_content","default_list_status","default_audio_language","autoplay","auto_next","default_provider"]);
const settingValue=z.string().trim().min(1).max(100);
const user=(request:AuthenticatedRequest)=>{if(!request.authUser)throw new AppError(401,"AUTH_REQUIRED","Authentication is required.");return request.authUser.id;};
const action=(handler:(request:AuthenticatedRequest)=>Promise<unknown>,created=false)=>async(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{try{res.status(created?201:200).json({success:true,data:await handler(req)});}catch(error){next(error);}};

export function createUserLibraryRouter(repository:UserLibraryRepository){const router=Router();
router.get("/favorites",action((r)=>repository.favorites(user(r))));
router.get("/favorites/:animeId",action(async r=>{
  const item=await repository.favorite(user(r),id.parse(r.params.animeId));
  if(!item)throw new AppError(404,"RESOURCE_NOT_FOUND","The requested resource was not found.");
  return item;
}));
router.post("/favorites",action((r)=>repository.saveFavorite(user(r),snapshot.parse(r.body)),true));
router.delete("/favorites/:animeId",action(async r=>{
  const removed=await repository.removeFavorite(user(r),id.parse(r.params.animeId));
  if(!removed)throw new AppError(404,"RESOURCE_NOT_FOUND","The requested resource was not found.");
  return {removed};
}));
router.get("/watchlist",action(r=>repository.watchlist(user(r),r.query.status?status.parse(r.query.status):undefined)));router.get("/watchlist/:animeId",action(r=>repository.watchlistItem(user(r),id.parse(r.params.animeId))));router.post("/watchlist",action(r=>{const body=z.union([z.object({anime:snapshot,status:status.default("PLANNING")}),snapshot.extend({status:status.default("PLANNING")})]).parse(r.body);return repository.saveWatchlist(user(r),"anime" in body?body.anime:body,body.status);},true));router.patch("/watchlist/:animeId",action(async r=>{const item=await repository.updateWatchlist(user(r),id.parse(r.params.animeId),status.parse((r.body as {status?:unknown}).status));if(!item)throw new AppError(404,"WATCHLIST_NOT_FOUND","That anime is not in your list.");return item;}));router.delete("/watchlist/:animeId",action(async r=>({removed:await repository.removeWatchlist(user(r),id.parse(r.params.animeId))})));
router.get("/history",action(r=>repository.recentlyViewed(user(r))));router.post("/history",action(r=>repository.recordViewed(user(r),snapshot.parse(r.body)),true));router.delete("/history/:animeId",action(async r=>({removed:await repository.removeViewed(user(r),id.parse(r.params.animeId))})));router.delete("/history",action(async r=>({removed:await repository.clearViewed(user(r))})));
router.get("/search-history",action(r=>repository.searches(user(r))));router.post("/search-history",action(r=>repository.saveSearch(user(r),z.object({query:z.string().trim().min(2).max(100)}).parse(r.body).query),true));router.delete("/search-history/:id",action(async r=>({removed:await repository.removeSearch(user(r),id.parse(r.params.id))})));router.delete("/search-history",action(async r=>({removed:await repository.clearSearches(user(r))})));
router.get("/settings",action(r=>repository.settings(user(r))));router.get("/settings/:key",action(async r=>{const key=settingKey.parse(r.params.key);return{key,value:await repository.setting(user(r),key)};}));router.put("/settings",action(async r=>{const values=z.record(settingKey,settingValue).parse(r.body);for(const[k,v]of Object.entries(values))await repository.saveSetting(user(r),k,validateSetting(k,v));return repository.settings(user(r));}));router.patch("/settings/:key",action(async r=>{const key=settingKey.parse(r.params.key),value=settingValue.parse((r.body as {value?:unknown}).value);return{key,value:await repository.saveSetting(user(r),key,validateSetting(key,value))};}));return router;}
