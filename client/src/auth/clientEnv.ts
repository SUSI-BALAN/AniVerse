export function validateClientEnv(values:Record<string,unknown>) {
 const mode=values.VITE_AUTH_MODE??"local";
 if(mode!=="local"&&mode!=="supabase")throw new Error("VITE_AUTH_MODE must be local or supabase.");
 const origin=(value:unknown,name:string,required:boolean)=>{
   if(!value&&!required)return "";
   if(typeof value!=="string")throw new Error(`${name} is required.`);
   let url:URL;try{url=new URL(value);}catch{throw new Error(`${name} must be an absolute origin.`);}
   if(!["https:","http:"].includes(url.protocol)||url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw new Error(`${name} must be an exact origin without a path.`);
   if(values.PROD&&url.protocol!=="https:"&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error(`${name} requires HTTPS.`);
   return url.origin;
 };
 const apiBase=origin(values.VITE_API_BASE_URL,"VITE_API_BASE_URL",false);
 const supabaseUrl=origin(values.VITE_SUPABASE_URL,"VITE_SUPABASE_URL",mode==="supabase");
 const key=values.VITE_SUPABASE_ANON_KEY;
 if(mode==="supabase"&&(typeof key!=="string"||key.length<20||key.startsWith("sb_secret_")))throw new Error("A browser-safe Supabase publishable key is required.");
 if(typeof key==="string"&&key.split('.').length===3){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='service_role')throw new Error('private');}catch{throw new Error("Use a browser-safe Supabase key.");}}
 return {mode:mode as "local"|"supabase",apiBase,supabaseUrl,key:typeof key==="string"?key:""};
}
