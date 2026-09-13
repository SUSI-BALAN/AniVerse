import { createApp } from "./app.js";
import { initializeDatabase } from "./database/connection.js";
import { env } from "./utils/env.js";
import {checkMigrations,closePostgres} from "./database/postgres.js";

if (env.DATABASE_MODE === "sqlite") initializeDatabase();
else await checkMigrations();
const app = createApp();
const server=app.listen(env.PORT, () => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", message: "AniVerse API listening", port: env.PORT, databaseMode: env.DATABASE_MODE, authMode: env.AUTH_MODE })));
let closing=false;
for(const signal of ["SIGTERM","SIGINT"] as const)process.on(signal,()=>{
 if(closing)return;closing=true;
 const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();
 server.close(()=>{void closePostgres().then(()=>{clearTimeout(deadline);process.exit(0);}).catch(()=>process.exit(1));});
 server.closeIdleConnections();
});
