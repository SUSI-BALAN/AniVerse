const API_BASE_URL=import.meta.env.VITE_API_BASE_URL??"";
let tokenProvider:()=>Promise<string|null>=async()=>null;
let refreshProvider:()=>Promise<string|null>=async()=>null;
let expireProvider:()=>Promise<void>=async()=>{};
let refreshing:Promise<string|null>|null=null;
let generation=0;
export function configureApiAuth(token:()=>Promise<string|null>,refresh:()=>Promise<string|null>,expire:()=>Promise<void>=async()=>{}){tokenProvider=token;refreshProvider=refresh;expireProvider=expire;generation++;}
export async function apiFetch(path:string,init:RequestInit={},retry=true):Promise<Response>{
 const scope=generation,token=await tokenProvider();const headers=new Headers(init.headers);
 if(token)headers.set("Authorization",`Bearer ${token}`);
 const response=await fetch(`${API_BASE_URL}${path}`,{...init,headers});
 if(response.status===401&&token&&retry){
   if(!refreshing)refreshing=refreshProvider().finally(()=>{refreshing=null;});
   const refreshed=await refreshing;
   if(refreshed&&scope===generation)return apiFetch(path,init,false);
 }
 if(response.status===401&&token&&scope===generation)await expireProvider();
 return response;
}
