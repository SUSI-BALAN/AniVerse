import { rateLimit } from "express-rate-limit";
import { logEvent, normalizeRoute } from '../utils/observability.js';
export function createApiRateLimit(limit=3000){return rateLimit({windowMs:15*60_000,limit,standardHeaders:"draft-8",legacyHeaders:false,handler:(request,response)=>{response.locals.errorCode="RATE_LIMITED";logEvent('warn','rate_limit',{route:normalizeRoute(request.path),status:429});response.status(429).json({success:false,error:{code:"RATE_LIMITED",message:"Too many requests. Please try again shortly.",requestId:response.getHeader("X-Request-Id")}});}});}
