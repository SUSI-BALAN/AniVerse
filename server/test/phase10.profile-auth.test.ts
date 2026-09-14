import {beforeEach,describe,expect,it,vi} from 'vitest';
const getUser=vi.hoisted(()=>vi.fn());
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser}})}));
import {verifySupabaseToken} from '../src/middleware/auth.js';
beforeEach(()=>vi.clearAllMocks());
describe('trusted profile account metadata',()=>{
 it('derives email and joined date from the verified Supabase user',async()=>{
  getUser.mockResolvedValue({error:null,data:{user:{id:'identity',email:'verified@example.invalid',created_at:'2025-01-02T00:00:00Z'}}});
  expect(await verifySupabaseToken('fixture')).toEqual({id:'identity',email:'verified@example.invalid',joinedAt:'2025-01-02T00:00:00Z'});
 });
 it('rejects unsuccessful verification and does not fabricate joined metadata',async()=>{
  getUser.mockResolvedValueOnce({error:{message:'invalid'},data:{user:null}});expect(await verifySupabaseToken('fixture')).toBeNull();
  getUser.mockResolvedValueOnce({error:null,data:{user:{id:'identity'}}});expect(await verifySupabaseToken('fixture')).toEqual({id:'identity',email:undefined,joinedAt:null});
 });
});
