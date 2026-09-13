import {useEffect,useState,type ReactNode} from "react";
import {authConfigurationError,authMode} from "./supabase";
export function ConfigurationGuard({children}:{children:ReactNode}) {
 const [error,setError]=useState(authConfigurationError);
 useEffect(()=>{let active=true;fetch(`${import.meta.env.VITE_API_BASE_URL??""}/api/version`).then(r=>r.ok?r.json():null).then(result=>{if(active&&result?.data?.authMode&&result.data.authMode!==authMode)setError("Client and server authentication modes differ. Configure both for local mode or both for online mode.");}).catch(()=>{});return()=>{active=false;};},[]);
 if(error)return <main className="page-shell py-20"><h1 className="text-2xl font-bold">AniVerse configuration needs attention</h1><p role="alert" className="mt-4">{error}</p></main>;
 return children;
}
