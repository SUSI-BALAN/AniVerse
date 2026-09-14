import {z} from 'zod';
import {AVATAR_IDS} from '../types/profile.types.js';

export const displayNameSchema = z.string()
  .refine(value => !/\p{Cc}/u.test(value), 'Display name cannot contain control characters.')
  .transform(value => value.trim())
  .refine(value => /[\p{L}\p{N}\p{P}\p{S}]/u.test(value), 'Enter a visible display name.')
  .refine(value => Array.from(value).length <= 40, 'Display name must contain at most 40 characters.');
export const profilePatchSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarId: z.enum(AVATAR_IDS).optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Choose a name or avatar to update.');
