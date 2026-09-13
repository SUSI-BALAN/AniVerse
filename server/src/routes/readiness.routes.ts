import { Router } from "express";
import { getDatabase } from "../database/connection.js";
import { checkMigrations } from "../database/postgres.js";
import { env } from "../utils/env.js";

export const readinessRouter=Router();
readinessRouter.get("/",async(_request,response)=>{try{if(env.DATABASE_MODE==="postgres")await checkMigrations();else getDatabase().prepare("SELECT 1").get();response.json({status:"ready",database:env.DATABASE_MODE,auth:env.AUTH_MODE});}catch{response.status(503).json({status:"not_ready",database:env.DATABASE_MODE});}});
