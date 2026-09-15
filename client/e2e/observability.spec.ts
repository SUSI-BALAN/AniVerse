import { expect, test } from '@playwright/test';

test('unexpected API errors show a safe support reference without stack details',async({page})=>{
  await page.route('**/api/anime/browse*',route=>route.fulfill({status:500,headers:{'Content-Type':'application/json','X-Request-ID':'4f92ab-support'},body:JSON.stringify({success:false,error:{code:'INTERNAL_ERROR',message:'Anime is temporarily unavailable.',requestId:'4f92ab-support'}})}));
  await page.goto('/browse');
  const alert=page.getByRole('alert');await expect(alert).toContainText('Anime is temporarily unavailable.');await expect(alert).toContainText('Reference: 4f92ab');
  await expect(page.getByText(/stack|database|token/i)).toHaveCount(0);
  await expect(alert.getByRole('button',{name:'Try again'})).toBeVisible();
});
