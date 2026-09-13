import "dotenv/config";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { X509Certificate } from "node:crypto";

const booleanEnv = z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_MODE: z.enum(["sqlite", "postgres"]).default("sqlite"),
  AUTH_MODE: z.enum(["local", "supabase"]).default("local"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DATABASE_SSL: booleanEnv.default(true),
  DATABASE_CA_CERT_PATH: z.string().trim().optional().default(""),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  BUILD_ID: z.string().max(100).default("development"),
  ANILIST_API_URL: z.string().url().default("https://graphql.anilist.co"),
  CINEXTREAM_BASE_URL: z.string().optional().default(""),
  YENIME_BASE_URL: z.string().optional().default(""),
  ZOKOANIME_BASE_URL: z.string().optional().default(""),
  CINEXTREAM_ENABLED: booleanEnv.default(false),
  YENIME_ENABLED: booleanEnv.default(false),
  ZOKOANIME_ENABLED: booleanEnv.default(false),
  CINEXTREAM_EMBED_PATH: z.string().optional().default(""),
  YENIME_EMBED_PATH: z.string().optional().default(""),
  ZOKOANIME_EMBED_PATH: z.string().optional().default(""),
  DEFAULT_PROVIDER: z.string().default("cinextream"),
  DATABASE_PATH: z.string().default("./data/aniverse.db"),
  ANILIST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  ANILIST_DETAILS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(43200),
  ANILIST_TRENDING_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(1200),
  ANILIST_POPULAR_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  ANILIST_SEASONAL_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(10800)
});

const parsed = envSchema.parse(process.env);
// Relative certificate paths resolve from the server working directory.
if (parsed.DATABASE_CA_CERT_PATH) {
  try {
    const certificate = readFileSync(resolve(parsed.DATABASE_CA_CERT_PATH), "utf8");
    const blocks = certificate.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    if (!blocks?.length || certificate.includes("PRIVATE KEY")) throw new Error();
    for (const block of blocks) {
      const ca = new X509Certificate(block);
      if (!ca.ca || Date.parse(ca.validFrom) > Date.now() || Date.parse(ca.validTo) <= Date.now()) throw new Error();
    }
  } catch {
    throw new Error("DATABASE_CA_CERT_PATH is invalid: provide a readable, valid PEM CA certificate.");
  }
}
export function validateProductionOrigin(value:string,production:boolean) {
  const url=new URL(value);
  if(url.username||url.password||url.pathname!=="/"||url.search||url.hash||!["http:","https:"].includes(url.protocol))throw new Error("CLIENT_ORIGIN must be an exact HTTP(S) origin without a path.");
  if(production&&url.protocol!=="https:")throw new Error("Production CLIENT_ORIGIN requires HTTPS.");
  return url.origin;
}
parsed.CLIENT_ORIGIN=validateProductionOrigin(parsed.CLIENT_ORIGIN,parsed.NODE_ENV==="production");
if(parsed.NODE_ENV==="production"&&parsed.SUPABASE_URL&&!parsed.SUPABASE_URL.startsWith("https://"))throw new Error("Production Supabase requires HTTPS.");

if (parsed.DATABASE_MODE === "postgres" && !parsed.DATABASE_URL) {
  throw new Error("DATABASE_URL is required when DATABASE_MODE=postgres.");
}
if (parsed.AUTH_MODE === "supabase" && (!parsed.SUPABASE_URL || !parsed.SUPABASE_ANON_KEY)) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required when AUTH_MODE=supabase.");
}
if ((parsed.DATABASE_MODE === "postgres") !== (parsed.AUTH_MODE === "supabase")) {
  throw new Error("PostgreSQL mode must use Supabase auth, and Supabase auth must use PostgreSQL mode.");
}

export const env = parsed;
