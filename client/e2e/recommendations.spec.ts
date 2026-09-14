import { expect, test } from '@playwright/test';
test('local recommendation reasons and focused favorite invalidation', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  const id = 201;
  try {
    expect((await request.post('/api/favorites', { data: { anilistId: id, title: 'Action Source', genres: ['Action'] } })).status()).toBe(201);
    await page.goto('/'); await expect(page.getByText('Similar to your favorite Action Source')).toBeVisible();
    const reads: string[] = []; page.on('request', r => { if (r.method() === 'GET') reads.push(new URL(r.url()).pathname); });
    await page.getByRole('link', { name: 'View details for Recommended Anime', exact: true }).first().click();
    await page.getByRole('button', { name: 'Favorite', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Favorited', exact: true })).toBeVisible();
    const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/recommendations/home' && r.status() === 200);
    await page.goto('/'); await refreshed;
    await expect(page.getByText('Because you like Action').first()).toBeVisible();
    await expect(page.getByText('Similar to your favorite Action Source')).toHaveCount(0);
    expect(reads).toContain('/api/recommendations/home'); expect(reads).not.toContain('/api/watchlist'); expect(reads).not.toContain('/api/history');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await request.delete('/api/favorites/201'); await request.delete('/api/favorites/2'); }
});
