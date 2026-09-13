// Scan candidate Git files without outputting any matched secret content.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import dotenv from 'dotenv';
const files=execFileSync('git',['ls-files','--cached','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const local={};for(const file of ['server/.env','client/.env.local'])if(fs.existsSync(file))Object.assign(local,dotenv.parse(fs.readFileSync(file)));
const secrets=Object.entries(local).filter(([k,v])=>v&&/^(DATABASE_URL|LIVE_TEST_PASSWORD(_B)?|SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|SUPABASE_MANAGEMENT_TOKEN)$/.test(k)).map(([,v])=>v);
try{const url=new URL(local.DATABASE_URL);if(url.password)secrets.push(decodeURIComponent(url.password));}catch{}
const forbidden=/(^|\/)(\.env(?:\..+)?|node_modules|dist|\.playwright|test-results|playwright-report|\.phase9-postgres)(\/|$)|\.(?:db|sqlite)(?:-wal|-shm)?$|\.(?:log|key|p12|pfx|crt|cer|pem|tsbuildinfo)$/i;
let bad=0;
for(const file of files){
  if(forbidden.test(file)&&!file.endsWith('.env.example')){bad++;continue;}
  const content=execFileSync('git',['show',`:${file}`],{encoding:'utf8',maxBuffer:20*1024*1024});
  if(secrets.some(s=>content.includes(s))||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsb_secret_[A-Za-z0-9_-]{10,}|\bgh[pousr]_[A-Za-z0-9]{25,}|\bAKIA[A-Z0-9]{16}\b|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/.test(content))bad++;
}
console.log(`SECRET SCAN: ${bad?'FAIL':'PASS'}`);
process.exitCode=bad?1:0;
