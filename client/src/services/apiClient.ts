const API_BASE_URL=import.meta.env.VITE_API_BASE_URL??"";
import { reportClientError } from './observability';
export type ApiErrorCategory='network'|'offline'|'authentication'|'validation'|'rate_limit'|'upstream'|'server'|'unknown';
export class ApiClientError extends Error{constructor(message:string,public readonly code:string,public readonly status:number,public readonly requestId:string|undefined,public readonly retryable:boolean,public readonly category:ApiErrorCategory){super(message);}}
const responseMeta=new WeakMap<Response,{requestId?:string;durationMs:number;attempt:number}>();
const category=(status:number,code:string):ApiErrorCategory=>!navigator.onLine?'offline':status===401?'authentication':status===400||status===422?'validation':status===429?'rate_limit':code.startsWith('ANILIST_')?'upstream':status>=500?'server':'unknown';
export function apiObservation(response:Response){return responseMeta.get(response);}
export async function apiError(response:Response,fallback='AniVerse could not complete this request.'){
 let body:{error?:{code?:string;message?:string;requestId?:string}}={};try{body=await response.clone().json();}catch{/* safe fallback */}
 const requestId=body.error?.requestId??response.headers.get('x-request-id')??undefined,code=body.error?.code??'REQUEST_FAILED',kind=category(response.status,code);
 return new ApiClientError(body.error?.message??fallback,code,response.status,requestId,response.status===0||response.status===408||response.status===429||response.status>=500,kind);
}
let tokenProvider:()=>Promise<string|null>=async()=>null;
let refreshProvider:()=>Promise<string|null>=async()=>null;
let expireProvider:()=>Promise<void>=async()=>{};
let refreshing:Promise<string|null>|null=null;
let generation=0;
export function configureApiAuth(token:()=>Promise<string|null>,refresh:()=>Promise<string|null>,expire:()=>Promise<void>=async()=>{}){tokenProvider=token;refreshProvider=refresh;expireProvider=expire;generation++;}
export async function apiFetch(path:string,init:RequestInit={},retry=true):Promise<Response>{
 const started=performance.now(),attempt=retry?1:2,scope=generation,token=await tokenProvider();const headers=new Headers(init.headers);
 if(token)headers.set("Authorization",`Bearer ${token}`);
 let response:Response;try{response=await fetch(`${API_BASE_URL}${path}`,{...init,headers});}catch(error){reportClientError({category:navigator.onLine?'network':'offline',route:path,messageCode:'NETWORK_ERROR'});throw error;}
 responseMeta.set(response,{requestId:response.headers.get('x-request-id')??undefined,durationMs:Math.round(performance.now()-started),attempt});
 if(response.status===401&&token&&retry){
   if(!refreshing)refreshing=refreshProvider().finally(()=>{refreshing=null;});
   const refreshed=await refreshing;
   if(refreshed&&scope===generation)return apiFetch(path,init,false);
 }
 if(response.status===401&&token&&scope===generation)await expireProvider();
 return response;
}
