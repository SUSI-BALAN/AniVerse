import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { configureApiAuth } from "../services/apiClient";
import { authConfigurationError, authMode, supabase } from "./supabase";

type AuthValue = {mode:"local"|"supabase";user:User|null;session:Session|null;loading:boolean;error:string|null;signIn:(email:string,password:string)=>Promise<void>;signUp:(email:string,password:string)=>Promise<boolean>;signOut:()=>Promise<void>;refreshSession:()=>Promise<string|null>};
const AuthContext=createContext<AuthValue>({mode:"local",user:null,session:null,loading:false,error:null,signIn:async()=>{},signUp:async()=>false,signOut:async()=>{},refreshSession:async()=>null});
export function friendlyAuthError(error:{code?:string;message?:string}) {
  if(error.code==="invalid_credentials" || error.message?.toLowerCase().includes("invalid login"))return "Invalid email or password.";
  if(error.code==="email_not_confirmed")return "Check your email to confirm your account before signing in.";
  if(error.code==="user_already_exists")return "Email is already registered.";
  if(error.code?.includes("rate_limit"))return "Too many attempts. Please wait and try again.";
  if(error.code==="weak_password")return "Choose a stronger password that meets the account password policy.";
  return "Authentication could not be completed. Please try again.";
}
export function AuthProvider({children}:{children:ReactNode}) {
  const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(authMode==="supabase"),[error,setError]=useState<string|null>(authConfigurationError);
  const signOut=useCallback(async()=>{
    setSession(null);
    if(supabase){const {error:failure}=await supabase.auth.signOut({scope:"local"});if(failure)setError("Unable to finish signing out. Please retry.");}
  },[]);
  const refreshSession=useCallback(async()=>{
    if(!supabase)return null;
    try {
      const {data,error:failure}=await supabase.auth.refreshSession();
      if(failure||!data.session){await signOut();setError("Your session expired. Please sign in again.");return null;}
      setSession(data.session);return data.session.access_token;
    } catch {await signOut();setError("Your session expired. Please sign in again.");return null;}
  },[signOut]);
  useEffect(()=>{
    if(!supabase){setLoading(false);configureApiAuth(async()=>null,async()=>null,async()=>{});return;}
    const client=supabase;let active=true;
    configureApiAuth(async()=>(await client.auth.getSession()).data.session?.access_token??null,refreshSession,signOut);
    void client.auth.getSession().then(({data,error:failure})=>{if(active){setSession(failure?null:data.session);setLoading(false);}}).catch(()=>{if(active){setLoading(false);setError("Unable to restore your session.");}});
    const {data}=client.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);setLoading(false);}});
    return()=>{active=false;data.subscription.unsubscribe();};
  },[refreshSession,signOut]);
  const signIn=useCallback(async(email:string,password:string)=>{
    if(!supabase)throw new Error(authConfigurationError??"Authentication is unavailable.");
    setError(null);const {data,error:failure}=await supabase.auth.signInWithPassword({email,password});
    if(failure)throw new Error(friendlyAuthError(failure));setSession(data.session);
  },[]);
  const signUp=useCallback(async(email:string,password:string)=>{
    if(!supabase)throw new Error(authConfigurationError??"Authentication is unavailable.");
    setError(null);const {data,error:failure}=await supabase.auth.signUp({email,password});
    if(failure)throw new Error(friendlyAuthError(failure));setSession(data.session);return Boolean(data.session);
  },[]);
  const value=useMemo<AuthValue>(()=>({mode:authMode,user:session?.user??null,session,loading,error,signIn,signUp,signOut,refreshSession}),[session,loading,error,signIn,signUp,signOut,refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}
