import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { token, users } from '../e2e/test-auth';

test('a11y cloud login and registration axe, error linkage and keyboard',async({page})=>{
  test.setTimeout(60000);
  for(const route of ['/login','/register']){
    await page.goto(route);await expect(page.getByLabel('Email')).toBeVisible();
    await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await test.info().attach('axe-auth',{body:JSON.stringify({route,violations:result.violations}),contentType:'application/json'});
    expect(result.violations).toEqual([]);
  }
  await page.getByLabel('Email').fill('fixture@example.com');
  await page.getByLabel('Password',{exact:true}).fill(randomUUID());await page.getByLabel('Confirm password').fill(randomUUID());
  await page.getByRole('button',{name:'Create Account',exact:true}).press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');
  await expect(page.getByLabel('Confirm password')).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Confirm password')).toHaveAttribute('aria-describedby','auth-error');
});

test('PWA cloud A/B cache isolation, offline failure and recovery',async({page,request,context})=>{
  test.setTimeout(60000);
  let owner=0;
  const headers=(i:number)=>({Authorization:'Bearer '+token(users[i],i?'b@example.com':'a@example.com')});
  await page.route('https://auth.test/**',r=>r.request().url().includes('logout')?r.fulfill({status:204}):r.fulfill({json:{access_token:token(users[owner],owner?'b@example.com':'a@example.com'),token_type:'bearer',expires_in:3600,refresh_token:randomUUID(),user:{id:users[owner],email:owner?'b@example.com':'a@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}}}));
  for(const i of [0,1])await request.patch('http://127.0.0.1:4176/api/profile',{headers:headers(i),data:{displayName:i?'Cache Owner B':'Cache Owner A',avatarId:'avatar-01'}});
  for(owner=0;owner<2;owner++){
    await page.goto('/login');await page.getByLabel('Email').fill(owner?'b@example.com':'a@example.com');await page.getByLabel('Password',{exact:true}).fill(randomUUID());await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.goto('/profile');await expect(page.getByLabel('Display name')).toHaveValue(owner?'Cache Owner B':'Cache Owner A');
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
    await page.reload();await expect(page.getByLabel('Display name')).toHaveValue(owner?'Cache Owner B':'Cache Owner A');
    const urls=await page.evaluate(async()=>{const all=[] as string[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())all.push(req.url);return all;});
    expect(urls.some(u=>u.includes('/api/')||u.includes('auth.test'))).toBe(false);
    await context.setOffline(true);
    await expect(page.getByText(/You’re offline/)).toBeVisible();
    expect(await page.evaluate(async()=>{try{await fetch('/api/profile');return 'served';}catch{return 'network-error';}})).toBe('network-error');
    await context.setOffline(false);await expect(page.getByText(/You’re offline/)).toHaveCount(0);
    await page.reload();await expect(page.getByLabel('Display name')).toHaveValue(owner?'Cache Owner B':'Cache Owner A');
    await page.getByRole('button',{name:'Sign out',exact:true}).first().click();
  }
});
