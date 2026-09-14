import {beforeEach,describe,expect,it,vi} from 'vitest';
import {apiFetch} from './apiClient';
import {displayNameError,profileApi} from './profileApi';
vi.mock('./apiClient',()=>({apiFetch:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
describe('profile API client',()=>{
 it('uses existing bearer-aware client for reads and supported PATCH fields',async()=>{
  vi.mocked(apiFetch).mockImplementation(async()=>new Response(JSON.stringify({data:{displayName:'Name',avatarId:'avatar-02'}}),{status:200}));
  await profileApi.get();await profileApi.update({displayName:'Name',avatarId:'avatar-02'});
  expect(apiFetch).toHaveBeenLastCalledWith('/api/profile',expect.objectContaining({method:'PATCH',body:JSON.stringify({displayName:'Name',avatarId:'avatar-02'})}));
 });
 it('reports session expiry safely',async()=>{vi.mocked(apiFetch).mockResolvedValue(new Response('',{status:401}));await expect(profileApi.get()).rejects.toThrow('session expired');});
 it('preserves Unicode without normalization and rejects invisible/control/oversized names',()=>{
  expect(displayNameError(' தமிழ் பெயர் ')).toBeNull();expect(displayNameError('🌸'.repeat(40))).toBeNull();for(const value of ['\u200b','\nName',' '.repeat(4),'🌸'.repeat(41)])expect(displayNameError(value)).not.toBeNull();
 });
});
