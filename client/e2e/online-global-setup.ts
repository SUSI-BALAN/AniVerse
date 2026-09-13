import type { FullConfig } from "@playwright/test";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
import {createServer as createViteServer} from "vite";
import {animeFixture,detailsFixture} from "../src/test/fixtures";
import {verifyToken,users} from "./test-auth";
export default async function setup(_config:FullConfig) {
 if(!process.env.TEST_DATABASE_URL)throw new Error("Online E2E requires an isolated TEST_DATABASE_URL; see docs/PHASE9_DEPLOYMENT.md.");
 Object.assign(process.env,{NODE_ENV:"test",DATABASE_MODE:"postgres",AUTH_MODE:"supabase",DATABASE_URL:process.env.TEST_DATABASE_URL,DATABASE_SSL:"false",SUPABASE_URL:"https://auth.test",SUPABASE_ANON_KEY:"test-anon-key-at-least-twenty-characters",PORT:"4176",CLIENT_ORIGIN:"http://127.0.0.1:4175",VITE_PROXY_TARGET:"http://127.0.0.1:4176",VITE_API_BASE_URL:"",VITE_AUTH_MODE:"supabase",VITE_SUPABASE_URL:"https://auth.test",VITE_SUPABASE_ANON_KEY:"test-anon-key-at-least-twenty-characters"});
 const {getPostgresPool,closePostgres}=await import("../../server/src/database/postgres.ts");
 const {migratePostgres}=await import("../../server/src/database/migratePostgres.ts");
 const pool=getPostgresPool();
 await pool.query(readFileSync(new URL("../../server/test/postgres-auth-fixture.sql",import.meta.url),"utf8"));
 await migratePostgres(pool);
 await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])",[users]);
 await pool.query("INSERT INTO auth.users(id) VALUES($1),($2)",users);
 const {createApp}=await import("../../server/src/app.ts");
 const page=async()=>({data:[animeFixture,{...animeFixture,id:2,title:{english:"Recommended Anime",romaji:null,native:null}}],pagination:{page:1,perPage:20,total:2,hasNextPage:false}});
 const api=createApp({tokenVerifier:async token=>verifyToken(token),animeService:{popular:page,trending:page,seasonal:page,browse:page,search:page,details:async()=>({...detailsFixture,recommendations:[{...animeFixture,id:2,title:{english:"Recommended Anime",romaji:null,native:null}}]})} as never}).listen(4176,"127.0.0.1");
 await new Promise<void>((resolve,reject)=>{api.once("listening",resolve);api.once("error",reject);});
 const vite=await createViteServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:4175,strictPort:true}});
 await vite.listen();
 return async()=>{await vite.close();await new Promise<void>(resolve=>api.close(()=>resolve()));await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])",[users]);await closePostgres();};
}
