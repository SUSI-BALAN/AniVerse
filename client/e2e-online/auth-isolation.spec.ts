import {expect,test,type Page} from "@playwright/test";
import {token,users} from "../e2e/test-auth";
const session=(id:string,email:string)=>({access_token:token(id,email),token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:id,user:{id,aud:"authenticated",role:"authenticated",email,app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:new Date().toISOString()}});
async function mocks(page:Page){
 await page.route("https://example.com/**",route=>route.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64")}));
 await page.route("https://auth.test/**",async route=>{
  if(route.request().url().includes("logout"))return route.fulfill({status:204,body:""});
  const data=route.request().postDataJSON()??{};const email=data.email??"a@example.com";
  if(route.request().url().includes("signup"))return route.fulfill({json:{user:session(users[email.startsWith("b")?1:0],email).user,session:null}});
  return route.fulfill({json:session(users[email.startsWith("b")?1:0],email)});
 });
}
async function register(page:Page,email:string){await page.goto("/register");await page.getByLabel("Email").fill(email);await page.getByLabel("Password",{exact:true}).fill("strong-password-123");await page.getByLabel("Confirm password").fill("strong-password-123");await page.getByRole("button",{name:"Create Account",exact:true}).click();await expect(page.getByRole("status")).toContainText("Check your email");}
async function login(page:Page,email:string){await page.goto("/login");await page.getByLabel("Email").fill(email);await page.getByLabel("Password",{exact:true}).fill("strong-password-123");await page.getByRole("button",{name:"Sign In",exact:true}).click();await expect(page.getByRole("button",{name:"Sign out",exact:true}).first()).toBeVisible();}
test("complete online account isolation and local backup migration",async({page})=>{
 test.setTimeout(90000);await mocks(page);await register(page,"a@example.com");await login(page,"a@example.com");
 await page.goto("/anime/1");await page.getByRole("button",{name:"Favorite",exact:true}).click();await expect(page.getByRole("button",{name:"Favorited",exact:true})).toBeVisible();
 await page.getByRole("button",{name:/My List/}).click();await page.getByRole("menuitem",{name:"Watching",exact:true}).click();
 const headers={Authorization:`Bearer ${token(users[0],"a@example.com")}`};
 expect((await page.request.put("http://127.0.0.1:4176/api/progress/1/1",{headers,data:{title:"Naruto",duration:100,currentTime:60,genres:["Action"]}})).ok()).toBe(true);
 await page.goto("/stats");await expect(page.getByRole("heading",{name:"Watching Statistics"})).toBeVisible();await expect(page.getByText("Naruto · Episode 1")).toBeVisible();
 await page.goto("/settings");const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export AniVerse Data"}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toContain("aniverse-backup");
 await page.getByRole("button",{name:"Sign out",exact:true}).first().click();await register(page,"b@example.com");await login(page,"b@example.com");
 await page.goto("/favorites");await expect(page.getByRole("heading",{name:"Naruto",exact:true})).toHaveCount(0);
 const bHeaders={Authorization:`Bearer ${token(users[1],"b@example.com")}`};
 const bExport=await(await page.request.get("http://127.0.0.1:4176/api/data/export",{headers:bHeaders})).json();for(const key of ["favorites","watchlist","watchHistory","episodeProgress"])expect(bExport[key]).toEqual([]);
 expect((await page.request.post("http://127.0.0.1:4176/api/favorites",{headers:bHeaders,data:{anilistId:202,title:"User B Anime"}})).ok()).toBe(true);
 await page.reload();await expect(page.getByRole("heading",{name:"User B Anime",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Sign out",exact:true}).first().click();await login(page,"a@example.com");
 await page.goto("/favorites");await expect(page.getByRole("heading",{name:"Naruto",exact:true})).toBeVisible();await expect(page.getByText("User B Anime")).toHaveCount(0);
 await page.goto("/settings");await expect(page.getByRole("button",{name:"Import Local AniVerse Backup"})).toBeVisible();
 await page.locator('input[type="file"]').setInputFiles({name:"local.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({app:"AniVerse",version:1,favorites:[{anilistId:303,title:"Imported Local Anime"}]}))});
 await expect(page.getByRole("status")).toContainText("Backup imported");
 await page.goto("/favorites");await expect(page.getByRole("heading",{name:"Imported Local Anime",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"Naruto",exact:true})).toBeVisible();
 const stats=await(await page.request.get("http://127.0.0.1:4176/api/stats",{headers})).json();expect(stats.data.favorites).toBe(2);
 const recommendations=await(await page.request.get("http://127.0.0.1:4176/api/recommendations",{headers})).json();expect(recommendations.data.some((x:{anime:{id:number}})=>x.anime.id===2)).toBe(true);
 await page.getByRole("button",{name:"Sign out",exact:true}).first().click();await expect(page).toHaveURL(/login/);await expect(page.getByText("Imported Local Anime")).toHaveCount(0);
});
