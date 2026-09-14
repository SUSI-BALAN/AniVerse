import { expect, test } from '@playwright/test';
test('Home request graph and usable public milestone', async ({ page }) => {
  const reads: string[] = []; let bytes = 0, homeBytes = 0; const start = Date.now();
  page.on('request', r => { const p = new URL(r.url()).pathname; if (r.method() === 'GET' && p.startsWith('/api/')) reads.push(p); });
  page.on('response', async r => { const path = new URL(r.url()).pathname; if (path.startsWith('/api/') && r.request().method() === 'GET') { try { const size = (await r.body()).length; bytes += size; if (path === '/api/home') homeBytes = size; } catch { /* cancelled responses have no payload */ } } });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Trending Now', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View details for Naruto', exact: true }).first()).toBeVisible();
  const publicReadyMs = Date.now() - start;
  await expect.poll(() => reads.some(p => p === '/api/home' || p === '/api/recommendations/home')).toBe(true);
  await page.waitForTimeout(700);
  const metrics = { requests: reads.length, public: reads.filter(p => p.startsWith('/api/anime/')).length, private: reads.filter(p => !p.startsWith('/api/anime/') && p !== '/api/version').length, homeBundle: reads.filter(p => p === '/api/home' || p === '/api/recommendations/home').length, bytes, homeBytes, publicReadyMs, paths: reads };
  console.info('HOME_GRAPH', JSON.stringify(metrics));
  await test.info().attach('home-request-graph', { body: JSON.stringify(metrics), contentType: 'application/json' });
  expect(metrics.homeBundle).toBe(1); expect(metrics.public).toBe(4);
  expect(reads).not.toContain('/api/stats'); expect(reads).not.toContain('/api/progress/continue-watching');
});
test('local Home greeting, playback summaries, mobile rails and focused update', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const oldProfile = (await (await request.get('/api/profile')).json()).data;
  try {
    await request.patch('/api/profile', { data: { displayName: 'Home Tester', avatarId: 'avatar-02' } });
    await request.post('/api/favorites', { data: { anilistId: 201, title: 'Action Source', genres: ['Action'] } });
    expect((await request.put('/api/progress/701/2', { data: { title: 'Home Resume', totalEpisodes: 12, currentTime: 50, duration: 100, completed: false } })).status()).toBe(200);
    expect((await request.put('/api/progress/702/1', { data: { title: 'Home Completed', totalEpisodes: 1, currentTime: 100, duration: 100, completed: true } })).status()).toBe(200);
    await page.goto('/'); await expect(page.getByText('Welcome back, Home Tester')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Continue Watching', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Home Resume', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recently Completed', exact: true })).toBeVisible();
    await expect(page.getByText('Because you watched Home Completed')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const reads: string[] = []; page.on('request', r => { if (r.url().includes('/api/home')) reads.push(r.url()); });
    await request.delete('/api/progress/702');
    await page.evaluate(() => window.dispatchEvent(new Event('aniverse:progress-changed')));
    await expect.poll(() => reads.some(r => r.includes('scope=activity'))).toBe(true);
    await expect(page.getByText('Because you watched Home Completed')).toHaveCount(0);
  } finally { await request.patch('/api/profile', { data: { displayName: oldProfile.displayName, avatarId: oldProfile.avatarId } }); for (const id of [201,2]) await request.delete('/api/favorites/' + id); for (const id of [701,702]) await request.delete('/api/progress/' + id); }
});
