export type ClientErrorCategory = 'network'|'offline'|'authentication'|'validation'|'rate_limit'|'upstream'|'server'|'render'|'unknown';
export type ClientErrorReport = { category:ClientErrorCategory; route:string; messageCode:string; requestId?:string; buildVersion:string; timestamp:string };
export const BUILD_VERSION = typeof __APP_BUILD_ID__ === 'undefined' ? 'test' : __APP_BUILD_ID__;
let testSink:((report:ClientErrorReport)=>void)|null=null;
const safeRoute=(route:string)=>route.split('?')[0].replace(/\/[0-9]+(?=\/|$)/g,'/:id').slice(0,120);
export function reportClientError(input:Omit<ClientErrorReport,'buildVersion'|'timestamp'|'route'>&{route:string}){
 const report:ClientErrorReport={...input,route:safeRoute(input.route),buildVersion:BUILD_VERSION,timestamp:new Date().toISOString()};
 if(testSink)testSink(report);else if(import.meta.env.DEV&&import.meta.env.MODE!=='test')console.error('[AniVerse]',report);
 return report;
}
export function setClientObservabilitySinkForTests(sink:((report:ClientErrorReport)=>void)|null){testSink=sink;}
export function supportReference(requestId?:string){return requestId&&/^[A-Za-z0-9._-]{1,64}$/.test(requestId)?requestId.split('-')[0].slice(0,8):undefined;}
export function errorMessageWithReference(error:Error&{status?:number;requestId?:string}){const reference=(error.status??0)>=500?supportReference(error.requestId):undefined;return reference?`${error.message} Reference: ${reference}`:error.message;}
