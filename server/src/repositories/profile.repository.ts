import type Database from 'better-sqlite3';
import type {Pool} from 'pg';
import type {UserProfileRepository} from './repository.contracts.js';
import {defaultProfile, type Profile, type ProfilePatch} from '../types/profile.types.js';
import {profilePatchSchema} from '../utils/profileValidation.js';

type ProfileRow = Omit<Profile, 'createdAt' | 'updatedAt'> & {createdAt: string | Date; updatedAt: string | Date};
function normalize(row: ProfileRow): Profile {
  return {...row, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString()};
}
const columns = 'user_id AS "userId", display_name AS "displayName", avatar_id AS "avatarId", created_at AS "createdAt", updated_at AS "updatedAt"';

export class SQLiteUserProfileRepository implements UserProfileRepository {
  constructor(private readonly db: Database.Database) {}
  async getProfile(userId: string): Promise<Profile> {
    const row = this.db.prepare(`SELECT ${columns} FROM profiles WHERE user_id=?`).get(userId) as ProfileRow | undefined;
    return row ? normalize(row) : defaultProfile(userId);
  }
  async updateProfile(userId: string, input: ProfilePatch): Promise<Profile> {
    const patch = profilePatchSchema.parse(input);
    this.db.prepare(`INSERT INTO profiles(user_id,display_name,avatar_id,created_at,updated_at)
      VALUES(?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ON CONFLICT(user_id) DO UPDATE SET
      display_name=CASE WHEN ? THEN excluded.display_name ELSE profiles.display_name END,
      avatar_id=CASE WHEN ? THEN excluded.avatar_id ELSE profiles.avatar_id END,
      updated_at=excluded.updated_at`).run(userId, patch.displayName ?? 'Anime Explorer', patch.avatarId ?? 'avatar-01', patch.displayName !== undefined ? 1 : 0, patch.avatarId !== undefined ? 1 : 0);
    return this.getProfile(userId);
  }
}

export class PostgresUserProfileRepository implements UserProfileRepository {
  constructor(private readonly pool: Pool) {}
  async getProfile(userId: string): Promise<Profile> {
    const result = await this.pool.query(`SELECT ${columns} FROM profiles WHERE user_id=$1`, [userId]);
    return result.rows[0] ? normalize(result.rows[0]) : defaultProfile(userId);
  }
  async updateProfile(userId: string, input: ProfilePatch): Promise<Profile> {
    const patch = profilePatchSchema.parse(input);
    const result = await this.pool.query(`INSERT INTO profiles(user_id,display_name,avatar_id) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET
      display_name=CASE WHEN $4::boolean THEN excluded.display_name ELSE profiles.display_name END,
      avatar_id=CASE WHEN $5::boolean THEN excluded.avatar_id ELSE profiles.avatar_id END,
      updated_at=now() RETURNING ${columns}`, [userId, patch.displayName ?? 'Anime Explorer', patch.avatarId ?? 'avatar-01', patch.displayName !== undefined, patch.avatarId !== undefined]);
    return normalize(result.rows[0]);
  }
}
