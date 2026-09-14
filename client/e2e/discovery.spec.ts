import { expect, test, type Page } from '@playwright/test';
import { animeFixture } from '../src/test/fixtures';

async function catalog(page: Page) {
  const requests: {path:string; bytes:number}[]=[];
  await page.route('**/api/anime/**',async route=>{
    const url=new URL(route.request().url());const current=Number(url.searchParams.get('page')??1);
    const body={success:true,data:[animeFixture],pagination:{page:current,perPage:20,total:40,hasNextPage:current===1}};
    requests.push({path:url.pathname,bytes:Buffer.byteLength(JSON.stringify(body))});
    await route.fulfill({json:body});
  });
  return requests;
}

test('Browse applies multiple filters, restores reload and Back/Forward, removes one chip and clears all',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await catalog(page);await page.setViewportSize({width:390,height:844});
  await page.goto('/browse');await page.getByRole('button',{name:'Filters',exact:true}).click();const d=page.getByRole('dialog');
  await d.getByRole('listbox').selectOption(['Action','Comedy']);await d.getByLabel('Year from').fill('2020');await d.getByLabel('Year to').fill('2026');
  await d.getByLabel('Format',{exact:true}).selectOption('TV');await d.getByLabel('Status',{exact:true}).selectOption('FINISHED');await d.getByLabel('Season',{exact:true}).selectOption('FALL');await d.getByLabel('Minimum score').selectOption('80');await d.getByLabel('Sort',{exact:true}).selectOption('SCORE');
  await d.getByRole('button',{name:'Show results'}).click();await expect(d).not.toBeVisible();await expect(page).toHaveURL(/genres=Action%2CComedy/);await expect(page).toHaveURL(/yearFrom=2020/);
  await page.reload();await page.getByRole('button',{name:/^Filters/}).click();await expect(d.getByLabel('Year to')).toHaveValue('2026');expect(await d.getByRole('listbox').evaluate((e:HTMLSelectElement)=>Array.from(e.selectedOptions).map(o=>o.value))).toEqual(['Action','Comedy']);await page.keyboard.press('Escape');await expect(d).not.toBeVisible();
  const before=page.url();await page.getByRole('button',{name:'Remove Action genres filter'}).click();await expect(page).toHaveURL(/genres=Comedy/);
  await page.goBack();await expect(page).toHaveURL(before);await expect(page.getByRole('button',{name:'Remove Action genres filter'})).toBeVisible();await page.goForward();await expect(page).toHaveURL(/genres=Comedy/);
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await page.goBack();await expect(page).not.toHaveURL(/page=2/);
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page).toHaveURL(/\/browse$/);await expect(page.getByLabel('Active filters')).toHaveCount(0);
});

test('mobile draft changes make zero catalog requests and one Apply makes one request without overflow',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const reads=await catalog(page);await page.setViewportSize({width:360,height:800});await page.goto('/browse');await expect(page.getByRole('heading',{name:'Naruto',exact:true})).toBeVisible();
  expect(reads.filter(x=>x.path==='/api/anime/browse')).toHaveLength(1);await page.getByRole('button',{name:'Filters',exact:true}).click();const d=page.getByRole('dialog');
  await d.getByRole('listbox').selectOption(['Action','Comedy']);await d.getByLabel('Year from').fill('2020');await d.getByLabel('Year to').fill('2026');await d.getByLabel('Format',{exact:true}).selectOption('TV');await d.getByLabel('Status',{exact:true}).selectOption('FINISHED');await d.getByLabel('Sort',{exact:true}).selectOption('SCORE');
  await page.waitForTimeout(500);expect(reads.filter(x=>x.path==='/api/anime/browse')).toHaveLength(1);
  await d.getByRole('button',{name:'Show results'}).click();await expect(d).not.toBeVisible();await expect.poll(()=>reads.filter(x=>x.path==='/api/anime/browse').length).toBe(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await test.info().attach('discovery-request-measurements',{body:JSON.stringify({browseInitial:1,mobileDraftRequests:0,mobileApplyRequests:1,payloadBytes:reads[0].bytes,historicalBaseline:'UNAVAILABLE'}),contentType:'application/json'});
});

test('Search debounces, selects a recent suggestion by keyboard, paginates and restores Back and history',async({page,request})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const reads=await catalog(page);await request.delete('/api/search-history');await request.post('/api/search-history',{data:{query:'Naruto Shippuden'}});
  try{
    await page.goto('/search');const input=page.getByRole('combobox',{name:'Search anime'});await input.fill('Nar');await expect(page.getByRole('listbox',{name:'Recent search suggestions'})).toBeVisible();await input.press('ArrowDown');await input.press('Enter');await expect(input).toHaveValue('Naruto Shippuden');await expect(page.getByRole('heading',{name:'Results for "Naruto Shippuden"'})).toBeVisible();await expect(page.getByRole('heading',{name:'Naruto',exact:true})).toBeVisible();
    expect(reads.filter(x=>x.path==='/api/anime/search')).toHaveLength(1);await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await page.goBack();await expect(page).not.toHaveURL(/page=2/);await expect(input).toHaveValue('Naruto Shippuden');
    await page.reload();await expect(input).toHaveValue('Naruto Shippuden');const history=(await(await request.get('/api/search-history')).json()).data;expect(history.some((x:{query:string})=>x.query==='Naruto Shippuden')).toBe(true);
    await test.info().attach('search-request-measurements',{body:JSON.stringify({oneDebouncedQueryRequests:1,payloadBytes:reads.find(x=>x.path==='/api/anime/search')?.bytes}),contentType:'application/json'});
  }finally{await request.delete('/api/search-history');}
});
