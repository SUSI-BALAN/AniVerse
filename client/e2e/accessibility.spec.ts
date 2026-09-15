import { expect, test, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { animeFixture } from '../src/test/fixtures';

const routes = ['/', '/browse', '/search', '/trending', '/seasonal', '/anime/1', '/favorites', '/my-list', '/history', '/profile', '/settings', '/stats', '/watch/1/1'];
async function ready(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('[data-route-announcement]')).toContainText('page loaded');
  await page.locator('main').evaluate(async () => { await document.fonts.ready; });
}
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 160; i++) {
    if (await target.evaluate(e => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard target unreachable: ' + await target.textContent());
}
for (const route of routes) test('a11y axe ' + route, async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page, route);
  // Wait for async private/catalog controls rather than auditing a skeleton only.
  if (route === '/profile') await expect(page.getByLabel('Display name')).toBeVisible();
  if (route === '/settings') await expect(page.getByLabel('Reduced motion')).toBeVisible();
  if (['/favorites','/my-list','/history'].includes(route)) await expect(page.getByText(/\d+ results/, { exact:true })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  await test.info().attach('axe', { body: JSON.stringify({route, violations: result.violations, incomplete: result.incomplete}), contentType:'application/json' });
  expect(result.violations.map(v => ({ rule:v.id, impact:v.impact, nodes:v.nodes.map(n=>n.target) }))).toEqual([]);
  await expect(page.getByRole('main')).toHaveCount(1);
});

test('a11y skip link, route focus and query-only stability', async ({page}) => {
  for (const route of ['/', '/browse']) {
    await ready(page,route); await page.keyboard.press('Tab');
    await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
    await page.keyboard.press('Enter'); await expect(page.getByRole('main')).toBeFocused();
  }
  await tabTo(page,page.getByRole('link',{name:'Search',exact:true}).first()); await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const status=page.locator('[data-route-announcement]');
  await expect(status).toHaveText('Search page loaded');
  await tabTo(page,page.getByRole('combobox')); await page.keyboard.type('Naruto');
  await expect(page).toHaveURL(/q=Naruto/); await expect(page.getByRole('combobox')).toBeFocused();
  await expect(status).toHaveText('Search page loaded');
});

test('a11y History tabs arrow Home End and associated panel',async({page})=>{
  await ready(page,'/history');
  const first=page.getByRole('tab',{name:'Watch History',exact:true});
  await tabTo(page,first);
  for(const [key,name]of [['ArrowRight','Recently Viewed'],['End','Recently Completed'],['Home','Watch History'],['ArrowLeft','Recently Completed']]){
    await page.keyboard.press(key);
    const tab=page.getByRole('tab',{name,exact:true});await expect(tab).toBeFocused();await expect(tab).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby',await tab.getAttribute('id') as string);
  }
});

test('a11y search combobox options, Escape and pagination keyboard state',async({page,request})=>{
  await request.delete('/api/search-history');
  for(const query of ['Naruto Shippuden','Naruto']) await request.post('/api/search-history',{data:{query}});
  await page.route('**/api/anime/search*',r=>r.fulfill({json:{success:true,data:[animeFixture],pagination:{page:Number(new URL(r.request().url()).searchParams.get('page')??1),perPage:20,total:40,hasNextPage:!r.request().url().includes('page=2')}}}));
  await ready(page,'/search');const input=page.getByRole('combobox');await tabTo(page,input);await page.keyboard.type('Nar');
  await expect(input).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('ArrowDown');await expect(input).toHaveAttribute('aria-activedescendant','search-suggestion-0');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('ArrowUp');await expect(input).toHaveAttribute('aria-activedescendant','search-suggestion-1');
  await page.keyboard.press('Escape');await expect(input).toHaveAttribute('aria-expanded','false');await expect(input).not.toHaveAttribute('aria-activedescendant');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(input).toHaveValue('Naruto');
  const pagination=page.getByRole('navigation',{name:'Pagination'});
  await expect(pagination.getByRole('button',{name:'Previous'})).toBeDisabled();
  await tabTo(page,pagination.getByRole('button',{name:'Next'}));await page.keyboard.press('Enter');
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('Page 2');
  await expect(pagination.getByRole('button',{name:'Next'})).toBeDisabled();await expect(input).not.toBeFocused();
  await request.delete('/api/search-history');
});

test('a11y lazy route has a single loading status and preserves navigation shell',async({page})=>{
  const devtools = await page.context().newCDPSession(page);
  await devtools.send('Network.enable');
  await devtools.send('Network.setCacheDisabled', { cacheDisabled: true });
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/*ProfilePage*',async r=>{await gate;await r.continue();});
  const navigation = page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/profile');
  try{await expect(page.getByRole('status').filter({hasText:'Loading AniVerse'})).toHaveCount(1);await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeVisible();}finally{release();}
  await navigation;
  await expect(page.locator('main h1')).toBeVisible();
});

test('a11y 200 percent text resizing preserves controls and dialogs',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:640,height:400});
  for(const route of ['/','/browse','/search','/favorites','/profile','/settings']){
    await ready(page,route);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  }
  await page.getByRole('button',{name:'Clear search history',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Cancel'})).toBeInViewport();await page.keyboard.press('Escape');
});

test('a11y dialogs and drawers isolate background and restore focus',async({page})=>{
  await ready(page,'/settings');
  const trigger=page.getByRole('button',{name:'Clear search history',exact:true});
  await tabTo(page,trigger);await page.keyboard.press('Enter');
  let dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert','');
  for(const key of ['Shift+Tab','Tab','Tab','Shift+Tab']){
    await page.keyboard.press(key);expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(page.locator('#root')).not.toHaveAttribute('inert');
  await page.setViewportSize({width:390,height:844});
  for(const route of ['/browse','/favorites']){
    await ready(page,route);const filters=page.getByRole('button',{name:'Filters',exact:true});
    await tabTo(page,filters);await page.keyboard.press('Enter');dialog=page.getByRole('dialog');
    await expect(page.locator('#root')).toHaveAttribute('inert','');
    await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab');await page.keyboard.press('Escape');await expect(filters).toBeFocused();
  }
});

test('a11y keyboard-only core flow',async({page,request})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:1280,height:800});await ready(page,'/');
  await tabTo(page,page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Browse',exact:true}));await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.setViewportSize({width:390,height:844});
  await tabTo(page,page.getByRole('button',{name:'Filters',exact:true}));await page.keyboard.press('Enter');
  await tabTo(page,page.getByRole('dialog').getByLabel('Format',{exact:true}));await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');
  await tabTo(page,page.getByRole('button',{name:'Show results'}));await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tabTo(page,page.getByRole('link',{name:'View details for Naruto',exact:true}).first());await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const favorite=page.getByRole('button',{name:'Favorite',exact:true});
  await tabTo(page,favorite);await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Favorited',exact:true})).toHaveAttribute('aria-pressed','true');
  await tabTo(page,page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'My List'}));await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'My List',exact:true})).toBeVisible();
  await tabTo(page,page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Settings'}));await page.keyboard.press('Enter');
  await tabTo(page,page.getByRole('link',{name:'Profile',exact:true}));await page.keyboard.press('Enter');
  await expect(page.getByLabel('Display name')).toBeVisible();
  await tabTo(page,page.getByRole('link',{name:'Preferences',exact:true}));await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await request.delete('/api/favorites/1');
});

test('a11y system and saved reduced motion',async({page,request})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page,'/');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  await page.emulateMedia({reducedMotion:'no-preference'});await ready(page,'/settings');
  const toggle=page.getByLabel('Reduced motion');await toggle.check();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  await page.goto('/');await expect(page.locator('.hero-copy')).toBeVisible();
  expect(await page.locator('.hero-copy').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await ready(page,'/settings');await page.getByLabel('Reduced motion').uncheck();
});

test('a11y 320/390 reflow, 200 percent equivalent viewport, landscape',async({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
  for(const size of [{width:320,height:844},{width:390,height:844},{width:640,height:400},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const route of ['/','/browse','/search','/favorites','/my-list','/history','/profile','/settings','/watch/1/1']){
      await ready(page,route);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+JSON.stringify(size)).toBe(true);
    }
    await page.getByRole('link',{name:'Settings',exact:true}).first().click();
    await page.getByRole('button',{name:'Clear search history',exact:true}).click();
    const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Cancel'})).toBeInViewport();
    await page.keyboard.press('Escape');
  }
});
