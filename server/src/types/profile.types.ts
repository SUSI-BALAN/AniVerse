export const AVATAR_IDS = ['avatar-01', 'avatar-02', 'avatar-03', 'avatar-04', 'avatar-05', 'avatar-06'] as const;
export type AvatarId = typeof AVATAR_IDS[number];
export type Profile = {
  userId: string;
  displayName: string;
  avatarId: AvatarId;
  createdAt: string | null;
  updatedAt: string | null;
};
export type ProfilePatch = Partial<Pick<Profile, 'displayName' | 'avatarId'>>;
export function defaultProfile(userId: string): Profile {
  return {userId, displayName: 'Anime Explorer', avatarId: 'avatar-01', createdAt: null, updatedAt: null};
}
