import {createClient} from '@supabase/supabase-js';
if(process.env.RUN_LIVE_SUPABASE_TESTS!=='true'){console.log('NOT VERIFIED: live Supabase smoke disabled.');process.exit(0);}
const required=['SUPABASE_URL','SUPABASE_ANON_KEY','LIVE_TEST_EMAIL','LIVE_TEST_PASSWORD','SMOKE_API_BASE_URL'];
for(const key of required)if(!process.env[key])throw new Error(`${key} is required for live smoke.`);
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const credentials={email:process.env.LIVE_TEST_EMAIL,password:process.env.LIVE_TEST_PASSWORD};
const registration=await client.auth.signUp(credentials);
if(registration.error)throw new Error('Live registration failed.');
const login=await client.auth.signInWithPassword(credentials);
if(login.error||!login.data.session)throw new Error('Live login unavailable; confirm the test account email then rerun.');
const response=await fetch(`${process.env.SMOKE_API_BASE_URL}/api/favorites`,{headers:{Authorization:`Bearer ${login.data.session.access_token}`}});
if(!response.ok)throw new Error('Live protected API check failed.');
const refreshed=await client.auth.refreshSession();if(refreshed.error)throw new Error('Live session refresh failed.');
const logout=await client.auth.signOut();if(logout.error)throw new Error('Live logout failed.');
console.log('Live registration/login/session/protected API/logout passed. Test account remains for operator cleanup.');
