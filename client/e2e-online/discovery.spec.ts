import { expect,test } from '@playwright/test';
test('isolated cloud public discovery URL restoration and details genre navigation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await page.goto('/browse');await page.getByRole('button',{name:'Filters',exact:true}).click();const d=page.getByRole('dialog');
  await d.getByRole('listbox').selectOption(['Action','Comedy']);await d.getByLabel('Year from').fill('2020');await d.getByLabel('Year to').fill('2026');await d.getByRole('button',{name:'Show results'}).click();
  await expect(page).toHaveURL(/genres=Action%2CComedy/);await page.reload();await expect(page.getByRole('button',{name:'Remove Action genres filter'})).toBeVisible();
  await page.goto('/anime/1');await page.getByRole('link',{name:'Action',exact:true}).click();await expect(page).toHaveURL(/browse\?genre=Action/);
  await page.goto('/search?q=Naruto');await expect(page.getByRole('combobox',{name:'Search anime'})).toHaveValue('Naruto');await expect(page.getByRole('heading',{name:'Naruto',exact:true})).toBeVisible();
});
