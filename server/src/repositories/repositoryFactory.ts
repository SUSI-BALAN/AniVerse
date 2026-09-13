import type Database from "better-sqlite3";
import { env } from "../utils/env.js";
import { getDatabase } from "../database/connection.js";
import { getPostgresPool } from "../database/postgres.js";
import { PostgresUserLibraryRepository, PostgresUserPlaybackRepository } from "./postgres.repositories.js";
import type { UserLibraryRepository, UserPlaybackRepository } from "./repository.contracts.js";
import { SQLiteUserLibraryRepository, SQLiteUserPlaybackRepository } from "./sqlite.adapters.js";

export type UserRepositories = { library: UserLibraryRepository; playback: UserPlaybackRepository };

export function createUserRepositories(sqlite?: Database.Database): UserRepositories {
  if (env.DATABASE_MODE === "postgres") {
    const pool = getPostgresPool();
    return { library: new PostgresUserLibraryRepository(pool), playback: new PostgresUserPlaybackRepository(pool) };
  }
  const db = sqlite ?? getDatabase();
  return { library: new SQLiteUserLibraryRepository(db), playback: new SQLiteUserPlaybackRepository(db) };
}
