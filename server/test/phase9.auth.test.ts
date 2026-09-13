import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { createUserLibraryRouter } from "../src/routes/userLibrary.routes.js";
import type { UserLibraryRepository } from "../src/repositories/repository.contracts.js";
import { env } from "../src/utils/env.js";
import type { AnimeSnapshotInput, Favorite } from "../src/types/library.types.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const originalMode=env.AUTH_MODE;
afterEach(()=>{env.AUTH_MODE=originalMode;});

function repository(){const records=new Map<string,Favorite[]>();const partial={
  async favorites(user:string){return records.get(user)??[];},async favorite(user:string,id:number){return(records.get(user)??[]).find(item=>item.anilistId===id)??null;},
  async saveFavorite(user:string,input:AnimeSnapshotInput){const saved={...input,id:1,addedAt:new Date().toISOString()} as Favorite;records.set(user,[...(records.get(user)??[]).filter(item=>item.anilistId!==input.anilistId),saved]);return saved;},
  async removeFavorite(user:string,id:number){const before=records.get(user)??[];records.set(user,before.filter(item=>item.anilistId!==id));return before.length!==(records.get(user)?.length??0);}
 } as unknown as UserLibraryRepository;return partial;}

function app(){env.AUTH_MODE="supabase";const application=express();application.use(express.json());application.use(createAuthMiddleware(async token=>token==="a"?{id:"user-a"}:token==="b"?{id:"user-b"}:null).requireAuth);application.use(createUserLibraryRouter(repository()));application.use(errorHandler);return application;}

describe("Phase 9 authentication and ownership",()=>{
 it("rejects missing and invalid bearer sessions",async()=>{expect((await request(app()).get("/favorites")).body.error.code).toBe("AUTH_REQUIRED");expect((await request(app()).get("/favorites").set("Authorization","Bearer invalid")).body.error.code).toBe("INVALID_SESSION");});
 it("derives ownership from the verified token and ignores supplied ownership",async()=>{const api=app();const anime={anilistId:101,title:"Private Anime",userId:"user-b"};expect((await request(api).post("/favorites").set("Authorization","Bearer a").send(anime)).status).toBe(201);expect((await request(api).get("/favorites").set("Authorization","Bearer a")).body.data).toHaveLength(1);expect((await request(api).get("/favorites").set("Authorization","Bearer b")).body.data).toEqual([]);});
});
