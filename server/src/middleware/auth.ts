import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest, AuthUser } from "../types/auth.types.js";
import { AppError } from "../utils/appError.js";
import { env } from "../utils/env.js";
import { logEvent, markAuthenticated } from '../utils/observability.js';

export type TokenVerifier = (token: string) => Promise<AuthUser | null>;

let client: SupabaseClient | null = null;
function supabaseClient() {
  if (!client) client = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const verifySupabaseToken: TokenVerifier = async (token) => {
  const started=performance.now();
  try{const { data, error } = await supabaseClient().auth.getUser(token);logEvent(error?'warn':'debug',error?'dependency.failed':'dependency.completed',{dependency:'supabase_auth',operation:'verify_token',durationMs:Math.round(performance.now()-started),success:!error});return error || !data.user ? null : { id: data.user.id, email: data.user.email, joinedAt: data.user.created_at ?? null };}
  catch(error){logEvent('warn','dependency.failed',{dependency:'supabase_auth',operation:'verify_token',durationMs:Math.round(performance.now()-started),success:false,errorCode:'AUTH_DEPENDENCY_FAILED'});throw error;}
};

const bearer = (request: AuthenticatedRequest) => {
  const value = request.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
};

export function createAuthMiddleware(verifier: TokenVerifier = verifySupabaseToken) {
  const resolve = async (request: AuthenticatedRequest) => {
    if (env.AUTH_MODE === "local") return { id: "local" } satisfies AuthUser;
    const token = bearer(request);
    return token ? verifier(token) : null;
  };
  return {
    optionalAuth: async (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
      try { request.authUser = (await resolve(request)) ?? undefined; next(); } catch (error) { next(error); }
    },
    requireAuth: async (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
      try {
        if (env.AUTH_MODE === "supabase" && !bearer(request)) { logEvent('info','auth.required',{dependency:'supabase_auth'}); throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue."); }
        const user = await resolve(request);
        if (!user) { logEvent('info','auth.invalid_token',{dependency:'supabase_auth'}); throw new AppError(401, "INVALID_SESSION", "Your session is invalid or has expired."); }
        request.authUser = user;
        markAuthenticated();
        logEvent('debug','auth.success',{dependency:'supabase_auth'});
        next();
      } catch (error) { next(error); }
    }
  };
}

export function authenticatedUserId(request: AuthenticatedRequest) {
  if (!request.authUser) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  return request.authUser.id;
}
