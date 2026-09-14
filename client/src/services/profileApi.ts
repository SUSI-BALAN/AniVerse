import {apiFetch} from './apiClient';
export const AVATARS = [
  {id:'avatar-01', label:'Moon'}, {id:'avatar-02', label:'Star'},
  {id:'avatar-03', label:'Sun'}, {id:'avatar-04', label:'Flower'},
  {id:'avatar-05', label:'Sparkles'}, {id:'avatar-06', label:'Flame'}
] as const;
export type AvatarId = typeof AVATARS[number]['id'];
export type Profile = {displayName:string; avatarId:AvatarId; createdAt:string|null; updatedAt:string|null; email:string|null; joinedAt:string|null; mode:'cloud'|'local'};
export type ProfilePatch = {displayName:string; avatarId:AvatarId};
export function displayNameError(value:string):string|null {
  if (/\p{Cc}/u.test(value)) return 'Display name cannot contain control characters.';
  const trimmed = value.trim();
  if (!/[\p{L}\p{N}\p{P}\p{S}]/u.test(trimmed)) return 'Enter a visible display name.';
  if (Array.from(trimmed).length > 40) return 'Display name must contain at most 40 characters.';
  return null;
}
async function request(init:RequestInit):Promise<Profile> {
  const response = await apiFetch('/api/profile',init);
  if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
  if (!response.ok) throw new Error('Unable to save or load your profile. Please try again.');
  const body = await response.json() as {data:Profile};
  return body.data;
}
export const profileApi = {
  get:(signal?:AbortSignal)=>request({signal}),
  update:(patch:ProfilePatch)=>request({method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)})
};
