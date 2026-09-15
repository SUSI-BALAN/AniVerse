import {SQLiteLibraryQueryRepository,PostgresLibraryQueryRepository,type LibraryQueryRepository} from './libraryQuery.repository.js';
import type Database from "better-sqlite3";
import { env } from "../utils/env.js";
import { getDatabase } from "../database/connection.js";
import { getPostgresPool } from "../database/postgres.js";
import { PostgresUserLibraryRepository, PostgresUserPlaybackRepository } from "./postgres.repositories.js";
import type { UserLibraryRepository, UserPlaybackRepository } from "./repository.contracts.js";
import { SQLiteUserLibraryRepository, SQLiteUserPlaybackRepository } from "./sqlite.adapters.js";
import {PostgresUserProfileRepository, SQLiteUserProfileRepository} from './profile.repository.js';
import type {UserProfileRepository} from './repository.contracts.js';
import { logEvent } from '../utils/observability.js';

// Optional only for backwards-compatible test/integration injection; the factory always supplies profile.
export type UserRepositories = { library: UserLibraryRepository; playback: UserPlaybackRepository; profile?: UserProfileRepository; queries?: LibraryQueryRepository };

export function observeRepository<T extends object>(repository: T, repositoryName: string): T {
  return new Proxy(repository, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== 'function') return value;
    return async (...args: unknown[]) => {
      const started = performance.now(), operation = `${repositoryName}.${String(property)}`;
      try {
        const result = await Reflect.apply(value, target, args), durationMs = Math.round(performance.now()-started);
        if (durationMs >= env.OBSERVABILITY_SLOW_MS) logEvent('warn','database.slow',{dependency:env.DATABASE_MODE==='postgres'?'postgres':'sqlite',operation,durationMs,success:true});
        return result;
      } catch (error) {
        logEvent('error','database.failed',{dependency:env.DATABASE_MODE==='postgres'?'postgres':'sqlite',operation,durationMs:Math.round(performance.now()-started),success:false,errorCode:'DATABASE_OPERATION_FAILED'});
        throw error;
      }
    };
  } }) as T;
}

export function createUserRepositories(sqlite?: Database.Database): UserRepositories {
  if (env.DATABASE_MODE === "postgres") {
    const pool = getPostgresPool();
    return { queries: observeRepository(new PostgresLibraryQueryRepository(pool),'queries'), library: observeRepository(new PostgresUserLibraryRepository(pool),'library'), playback: observeRepository(new PostgresUserPlaybackRepository(pool),'playback'), profile: observeRepository(new PostgresUserProfileRepository(pool),'profile') };
  }
  const db = sqlite ?? getDatabase();
  return { queries: observeRepository(new SQLiteLibraryQueryRepository(db),'queries'), library: observeRepository(new SQLiteUserLibraryRepository(db),'library'), playback: observeRepository(new SQLiteUserPlaybackRepository(db),'playback'), profile: observeRepository(new SQLiteUserProfileRepository(db),'profile') };
}
