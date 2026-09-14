import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('local profile name and preset avatar persist after refresh',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/settings');
 await page.getByRole('link',{name:'Profile',exact:true}).click();await expect(page.getByRole('heading',{name:'Local Profile',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const original=await page.getByLabel('Display name').inputValue();const selected=await page.locator('input[name="avatar"]:checked').inputValue();
 const name='Local '+randomUUID().slice(0,8);
 try{
  await page.getByLabel('Display name').fill(name);await page.getByRole('radio',{name:'Moon avatar'}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('radio',{name:'Star avatar'})).toBeChecked();
  await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByLabel('Display name')).toHaveValue(name);await expect(page.getByRole('radio',{name:'Star avatar'})).toBeChecked();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export AniVerse Data'}).click();expect((await download).suggestedFilename()).toContain('aniverse-backup');
 }finally{
  await page.getByLabel('Display name').fill(original);await page.locator(`input[name="avatar"][value="${selected}"]`).check();const save=page.getByRole('button',{name:'Save profile',exact:true});if(await save.isEnabled()){await save.click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible();}
 }
});
