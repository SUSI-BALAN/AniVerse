import {expect,it} from "vitest";
import {validateClientEnv} from "./clientEnv";
it("preserves local defaults",()=>expect(validateClientEnv({}).mode).toBe("local"));
it("rejects invalid online configuration",()=>{expect(()=>validateClientEnv({VITE_AUTH_MODE:"other"})).toThrow();expect(()=>validateClientEnv({VITE_AUTH_MODE:"supabase"})).toThrow();expect(()=>validateClientEnv({PROD:true,VITE_API_BASE_URL:"http://api.example.com"})).toThrow();expect(()=>validateClientEnv({VITE_API_BASE_URL:"https://example.com/path"})).toThrow();});
