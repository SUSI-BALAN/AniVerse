import {act,render,screen,waitFor} from "@testing-library/react";
import {beforeEach,expect,it,vi} from "vitest";
const sdk=vi.hoisted(()=>({getSession:vi.fn(),onAuthStateChange:vi.fn(),signInWithPassword:vi.fn(),signUp:vi.fn(),signOut:vi.fn(),refreshSession:vi.fn()}));
vi.mock("./supabase",()=>({authMode:"supabase",authConfigurationError:null,supabase:{auth:sdk}}));
import {AuthProvider,useAuth,friendlyAuthError} from "./AuthContext";
let auth:ReturnType<typeof useAuth>;
function Consumer(){auth=useAuth();return <p>{auth.loading?"loading":auth.user?.id??"signed out"}</p>;}
const session={access_token:"valid",user:{id:"a"}};
beforeEach(()=>{vi.clearAllMocks();sdk.getSession.mockResolvedValue({data:{session},error:null});sdk.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});sdk.signOut.mockResolvedValue({error:null});});
it("restores a session and clears it on logout",async()=>{render(<AuthProvider><Consumer/></AuthProvider>);await screen.findByText("a");await act(()=>auth.signOut());expect(screen.getByText("signed out")).toBeInTheDocument();expect(sdk.signOut).toHaveBeenCalledWith({scope:"local"});});
it("reports confirmation required when registration has no session",async()=>{sdk.signUp.mockResolvedValue({data:{session:null,user:{id:"a"}},error:null});render(<AuthProvider><Consumer/></AuthProvider>);await screen.findByText("a");let immediate=true;await act(async()=>{immediate=await auth.signUp("a@example.com","password");});expect(immediate).toBe(false);expect(screen.getByText("signed out")).toBeInTheDocument();});
it("supports immediate registration sessions",async()=>{sdk.signUp.mockResolvedValue({data:{session},error:null});render(<AuthProvider><Consumer/></AuthProvider>);await screen.findByText("a");await act(async()=>{expect(await auth.signUp("a@example.com","password")).toBe(true);});});
it("signs out after failed refresh and presents expiry message",async()=>{sdk.refreshSession.mockResolvedValue({data:{session:null},error:{code:"refresh_token_not_found"}});render(<AuthProvider><Consumer/></AuthProvider>);await screen.findByText("a");await act(async()=>{expect(await auth.refreshSession()).toBeNull();});expect(screen.getByText("signed out")).toBeInTheDocument();expect(auth.error).toContain("session expired");});
it("translates invalid credentials without SDK internals",()=>{expect(friendlyAuthError({code:"invalid_credentials",message:"internal"})).toBe("Invalid email or password.");expect(friendlyAuthError({message:"sensitive internal details"})).not.toContain("sensitive");});
