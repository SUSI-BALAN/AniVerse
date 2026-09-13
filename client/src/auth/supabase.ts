import { createClient } from "@supabase/supabase-js";
import {validateClientEnv} from "./clientEnv";
let config:ReturnType<typeof validateClientEnv>|null=null;
let problem:string|null=null;
try{config=validateClientEnv(import.meta.env);}catch(error){problem=error instanceof Error?error.message:"Invalid client configuration.";}
export const authMode=config?.mode??"supabase";
export const supabase=config?.mode==="supabase"?createClient(config.supabaseUrl,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const authConfigurationError=problem;
