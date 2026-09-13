import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/utils/env.js";
import express from "express";
import { createApiRateLimit } from "../src/middleware/rateLimits.js";

const originalNodeEnv=env.NODE_ENV;
afterEach(()=>{env.NODE_ENV=originalNodeEnv;});
const database=()=>{const db=new Database(":memory:");db.exec(readFileSync(new URL("../src/database/schema.sql",import.meta.url),"utf8"));return db;};

describe("Phase 9 production security",()=>{
 it("uses exact-origin CORS and emits request IDs",async()=>{const app=createApp({database:database()});const allowed=await request(app).get("/api/health").set("Origin",env.CLIENT_ORIGIN);const denied=await request(app).get("/api/health").set("Origin","https://attacker.example");expect(allowed.headers["access-control-allow-origin"]).toBe(env.CLIENT_ORIGIN);expect(denied.headers["access-control-allow-origin"]).toBeUndefined();expect(allowed.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);});
 it("creates a bounded production CSP without wildcard frame sources",async()=>{env.NODE_ENV="production";const response=await request(createApp({database:database()})).get("/api/health");expect(response.headers["content-security-policy"]).toContain("frame-src 'self'");expect(response.headers["content-security-policy"]).not.toContain("frame-src *");expect(response.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");});
 it("keeps health public and reports SQLite readiness",async()=>{const app=createApp({database:database()});expect((await request(app).get("/api/health")).status).toBe(200);const ready=await request(app).get("/api/ready");expect(ready.status).toBe(200);expect(ready.body.database).toBe("sqlite");});
 it("returns the stable 429 envelope after the configured limit",async()=>{const app=express();app.set("trust proxy",1);app.use(createApiRateLimit(2));app.get("/",(_req,res)=>res.json({ok:true}));expect((await request(app).get("/")).status).toBe(200);expect((await request(app).get("/")).status).toBe(200);const limited=await request(app).get("/");expect(limited.status).toBe(429);expect(limited.body.error.code).toBe("RATE_LIMITED");});
});
