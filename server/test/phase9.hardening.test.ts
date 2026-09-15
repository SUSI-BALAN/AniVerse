import Database from "better-sqlite3";
import request from "supertest";
import {expect,it} from "vitest";
import {createApp} from "../src/app.js";
import {initializeDatabase} from "../src/database/connection.js";
import {validateProductionOrigin,env} from "../src/utils/env.js";
import {ProviderManager} from "../src/providers/providerManager.js";
import {CinextreamProvider} from "../src/providers/cinextream.provider.js";
import {checkMigrations} from "../src/database/postgres.js";
import {setObservabilitySinkForTests} from '../src/utils/observability.js';

it("requires exact HTTPS production origins",()=>{expect(validateProductionOrigin("https://app.example.com",true)).toBe("https://app.example.com");for(const value of ["http://app.example.com","https://app.example.com/path","https://app.example.com?q=x"])expect(()=>validateProductionOrigin(value,true)).toThrow();});
it("returns 400 for malformed private limits and settings",async()=>{const db=new Database(":memory:");initializeDatabase(db);const app=createApp({database:db});for(const path of ["progress/continue-watching","watch-history","recommendations"])expect((await request(app).get(`/api/${path}?limit=no`)).status).toBe(400);expect((await request(app).patch("/api/settings/title_preference").send({value:"arbitrary"})).status).toBe(400);db.close();});
it("excludes disabled providers from production frame policy",async()=>{const db=new Database(":memory:");initializeDatabase(db);const original=env.NODE_ENV;env.NODE_ENV="production";try{const manager=new ProviderManager(new Map([["cinextream",new CinextreamProvider(false,"https://disabled.example","/embed/{anilistId}/{episode}/{language}")]]));const response=await request(createApp({database:db,providerManager:manager})).get("/api/health");expect(response.headers["content-security-policy"]).not.toContain("disabled.example");expect(response.headers["x-content-type-options"]).toBe("nosniff");}finally{env.NODE_ENV=original;db.close();}});
it("readiness detects unavailable databases and recovery",async()=>{let available=true;const pool={query:async(sql:string)=>{if(!available)throw new Error("offline");return {rows:sql.includes("schema_migrations")?[{name:"001_user_data.sql"},{name:"002_profiles.sql"}]:[]};}};await expect(checkMigrations(pool as never)).resolves.toBeUndefined();available=false;await expect(checkMigrations(pool as never)).rejects.toThrow();available=true;await expect(checkMigrations(pool as never)).resolves.toBeUndefined();});
it("never logs bearer tokens or password payloads",async()=>{const db=new Database(":memory:");initializeDatabase(db);const logs:string[]=[];setObservabilitySinkForTests(line=>logs.push(line));try{await request(createApp({database:db})).patch("/api/settings/theme").set("Authorization","Bearer secret-token").send({value:"invalid",password:"secret-password"});const output=logs.join('\n');expect(output).not.toContain("secret-token");expect(output).not.toContain("secret-password");expect(output).toContain("VALIDATION_ERROR");}finally{setObservabilitySinkForTests(null);db.close();}});
