import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadEnv} from 'vite';
const root=process.cwd();
const env={...loadEnv('production',root,''),...loadEnv('production',resolve(root,'client'),''),...process.env};
function origin(value){const url=new URL(value);const localhost=url.hostname==='localhost'||url.hostname==='127.0.0.1';if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(!localhost&&url.protocol!=='https:'))throw new Error('Static hosting requires exact origins (HTTPS outside localhost).');return url.origin;}
const connections=["'self'"];
for(const key of ['VITE_API_BASE_URL','VITE_SUPABASE_URL'])if(env[key] && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\/?$/i.test(env[key]))connections.push(origin(env[key]));
const frames=[];
for(const key of ['CINEXTREAM','YENIME','ZOKOANIME']){
 if(env[`${key}_ENABLED`]==='true'){
  const path=env[`${key}_EMBED_PATH`];
  if(!path||!path.startsWith('/')||path.startsWith('//')||!path.includes('{episode}'))throw new Error('Enabled provider requires an approved embed path.');
  frames.push(origin(env[`${key}_BASE_URL`]));
 }
}
const csp=["default-src 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'","img-src 'self' data: https://s4.anilist.co https://s.anilist.co",`connect-src ${connections.join(' ')}`,`frame-src ${frames.length?frames.join(' '):"'none'"}`,"object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
await writeFile(resolve(root,'client/dist/_headers'),`/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: DENY\n  Strict-Transport-Security: max-age=31536000\n\n/sw.js\n  Cache-Control: no-cache, must-revalidate\n\n/manifest.webmanifest\n  Cache-Control: no-cache, must-revalidate\n`);
await writeFile(resolve(root,'client/dist/_redirects'),'/* /index.html 200\n');
console.log('Static HTML headers and SPA fallback generated.');
