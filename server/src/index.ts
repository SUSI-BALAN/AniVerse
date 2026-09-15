import { createApp } from "./app.js";
import { initializeDatabase } from "./database/connection.js";
import { env } from "./utils/env.js";
import {checkMigrations,closePostgres} from "./database/postgres.js";
import { logEvent } from './utils/observability.js';

if (env.DATABASE_MODE === "sqlite") initializeDatabase();
else await checkMigrations();
const app = createApp();
const providersEnabled = ['cinextream','yenime','zokoanime'].filter(name => env[`${name.toUpperCase()}_ENABLED` as 'CINEXTREAM_ENABLED'|'YENIME_ENABLED'|'ZOKOANIME_ENABLED']);
const server=app.listen(env.PORT, () => logEvent('info','startup.completed',{environment:env.NODE_ENV,buildVersion:env.BUILD_ID,port:env.PORT,databaseMode:env.DATABASE_MODE,authMode:env.AUTH_MODE,providersEnabled}));
let closing=false;
for(const signal of ["SIGTERM","SIGINT"] as const)process.on(signal,()=>{
 if(closing)return;closing=true;logEvent('info','shutdown.started',{signal});
 const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();
 server.close(()=>{void closePostgres().then(()=>{clearTimeout(deadline);logEvent('info','shutdown.completed');process.exit(0);}).catch(error=>{logEvent('error','shutdown.failed',{errorCode:'DATABASE_CLOSE_FAILED'});process.exit(1);});});
 server.closeIdleConnections();
});
