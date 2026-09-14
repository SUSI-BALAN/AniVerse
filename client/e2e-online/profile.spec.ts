import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {token,users} from '../e2e/test-auth';

test('isolated cloud profile login save refresh logout and A/B isolation',async({page})=>{
 const joinedAt='2025-01-02T00:00:00.000Z';
 await page.route('https://auth.test/**',async route=>{
  if(route.request().url().includes('logout'))return route.fulfill({status:204,body:''});
  const email=route.request().postDataJSON()?.email??'a@example.com';const id=users[email.startsWith('b')?1:0];
  return route.fulfill({json:{access_token:token(id,email),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:randomUUID(),user:{id,aud:'authenticated',role:'authenticated',email,app_metadata:{provider:'email'},user_metadata:{},created_at:joinedAt}}});
 });
 const login=async(email:string)=>{await page.goto('/login');await page.getByLabel('Email').fill(email);await page.getByLabel('Password',{exact:true}).fill(randomUUID());await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page.getByRole('button',{name:'Sign out',exact:true}).first()).toBeVisible();};
 const headers=(i:number)=>({Authorization:'Bearer '+token(users[i],i?'b@example.com':'a@example.com')});
 await page.request.patch('http://127.0.0.1:4176/api/profile',{headers:headers(0),data:{displayName:'Initial A',avatarId:'avatar-01'}});
 await page.request.patch('http://127.0.0.1:4176/api/profile',{headers:headers(1),data:{displayName:'Initial B',avatarId:'avatar-01'}});
 await login('a@example.com');await page.goto('/profile');await expect(page.getByText('a@example.com',{exact:true})).toBeVisible();
 await page.getByLabel('Display name').fill('தமிழ் Profile');await page.getByRole('radio',{name:'Flower avatar'}).check();await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Display name')).toHaveValue('தமிழ் Profile');await expect(page.getByRole('radio',{name:'Flower avatar'})).toBeChecked();
 await page.getByRole('button',{name:'Sign out',exact:true}).last().click();await expect(page).toHaveURL(/login/);
 await login('b@example.com');await page.goto('/profile');await expect(page.getByLabel('Display name')).toHaveValue('Initial B');await expect(page.getByText('b@example.com',{exact:true})).toBeVisible();
 await page.getByLabel('Display name').fill('Profile B');await page.getByRole('radio',{name:'Flame avatar'}).check();await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();
 const a=await(await page.request.get('http://127.0.0.1:4176/api/profile',{headers:headers(0)})).json();expect(a.data.displayName).toBe('தமிழ் Profile');
});
