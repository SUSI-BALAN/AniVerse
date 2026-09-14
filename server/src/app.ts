import {createLibraryQueryRouter} from './routes/libraryQuery.routes.js';
import {SQLiteLibraryQueryRepository,PostgresLibraryQueryRepository} from './repositories/libraryQuery.repository.js';
import cors from "cors";
import type { Pool } from "pg";
import express from "express";
import helmet from "helmet";
import type { AnimeListServiceContract } from "./services/anilist.service.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createAnimeRouter } from "./routes/anime.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { env } from "./utils/env.js";
import type Database from "better-sqlite3";
import { getDatabase } from "./database/connection.js";
import { createProvidersRouter } from "./routes/providers.routes.js";
import { ProviderManager } from "./providers/providerManager.js";
import { createDataRouter } from "./routes/data.routes.js";
import { createRecommendationRouter } from "./routes/recommendation.routes.js";
import { createAuthMiddleware, type TokenVerifier } from "./middleware/auth.js";
import { requestContext } from "./middleware/requestContext.js";
import { readinessRouter } from "./routes/readiness.routes.js";
import { createUserRepositories, type UserRepositories } from "./repositories/repositoryFactory.js";
import { createUserLibraryRouter } from "./routes/userLibrary.routes.js";
import { createUserPlaybackRouter } from "./routes/userPlayback.routes.js";
import { createCloudDataRouter } from "./routes/cloudData.routes.js";
import { createUserInsightsRouter } from "./routes/userInsights.routes.js";
import { getPostgresPool } from "./database/postgres.js";
import { createApiRateLimit } from "./middleware/rateLimits.js";
import {createProfileRouter} from './routes/profile.routes.js';
import { createHomeRouter } from './routes/home.routes.js';
import {PostgresUserProfileRepository, SQLiteUserProfileRepository} from './repositories/profile.repository.js';

type AppOptions = {
  animeService?: AnimeListServiceContract;
  database?: Database.Database;
  providerManager?: ProviderManager;
  repositories?: UserRepositories;
  tokenVerifier?: TokenVerifier;
  postgresPool?: Pool;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const providerManager = options.providerManager ?? new ProviderManager();
  const providerOrigins = providerManager.list().filter(provider=>provider.enabled&&provider.status==="AVAILABLE").flatMap((provider) => provider.allowedOrigins);
  const supabaseOrigin = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).origin : null;

  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
  app.use(requestContext);
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "https://s4.anilist.co", "https://s.anilist.co"], connectSrc: ["'self'", "https://graphql.anilist.co", ...(supabaseOrigin ? [supabaseOrigin] : [])], frameSrc: ["'self'", ...providerOrigins], objectSrc: ["'none'"], baseUri: ["'self'"] } } : false, referrerPolicy: { policy: "strict-origin-when-cross-origin" } }));
  app.use((_request, response, next) => { response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"); next(); });
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || origin === env.CLIENT_ORIGIN),
      credentials: false
    })
  );
  app.use("/api/data/import", express.json({ limit: "1mb" }));
  app.use(express.json({ limit: "128kb" }));
  if (env.NODE_ENV === "production") {
    app.use("/api", createApiRateLimit());
    app.use("/api/anime",createApiRateLimit(1200));
    app.use("/api/providers/resolve",createApiRateLimit(300));
    app.use("/api/data/import",createApiRateLimit(20));
    const writes=createApiRateLimit(1800);
    app.use("/api",(req,res,next)=>["POST","PUT","PATCH","DELETE"].includes(req.method)?writes(req,res,next):next());
  }

  app.use("/api/health", healthRouter);
  app.use("/api/ready", readinessRouter);
  app.get("/api/version", (_request, response) => response.json({ success: true, data: { version: "0.1.0", buildId: env.BUILD_ID, environment: env.NODE_ENV,authMode:env.AUTH_MODE } }));
  app.use("/api/anime", createAnimeRouter(options.animeService));
  app.use("/api/providers", createProvidersRouter(providerManager));
  const auth = createAuthMiddleware(options.tokenVerifier);
  const repositories = options.repositories ?? createUserRepositories(options.database);
  app.use("/api", auth.requireAuth);
  app.use("/api",(_req,res,next)=>{res.setHeader("Cache-Control","no-store");next();});
  const profile = repositories.profile ?? (env.DATABASE_MODE === 'postgres'
    ? new PostgresUserProfileRepository(options.postgresPool ?? getPostgresPool())
    : new SQLiteUserProfileRepository(options.database ?? getDatabase()));
  app.use('/api', createProfileRouter(profile));
  app.use('/api', createHomeRouter({ ...repositories, profile }, options.animeService));
  const queries = repositories.queries ?? (env.DATABASE_MODE === 'postgres' ? new PostgresLibraryQueryRepository(options.postgresPool ?? getPostgresPool()) : new SQLiteLibraryQueryRepository(options.database ?? getDatabase()));
  app.use('/api', createLibraryQueryRouter(queries));
  app.use("/api", createUserLibraryRouter(repositories.library));
  app.use("/api", createUserPlaybackRouter(repositories.playback));
  if (env.DATABASE_MODE === "postgres") {
    app.use("/api", createCloudDataRouter(options.postgresPool ?? getPostgresPool()));

  } else {
    const database = options.database ?? getDatabase();
    app.use("/api", createDataRouter(database));

  }

  app.use("/api", createUserInsightsRouter(repositories, options.animeService));
  app.use("/api", createRecommendationRouter(repositories, options.animeService));

  app.use((_, response) => {
    response.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested AniVerse API route was not found."
      }
    });
  });

  app.use(errorHandler);

  return app;
}
