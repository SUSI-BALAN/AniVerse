import { expect, test } from '@playwright/test';

test('PWA manifest and shell assets are reachable with safe metadata', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest'); expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json(); expect(manifest.start_url).toBe('/'); expect(manifest.scope).toBe('/'); expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('/sw.js')).ok()).toBe(true);
});

test('mobile routes remain usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/browse', '/search', '/favorites', '/profile', '/settings', '/watch/1/1']) {
    await page.goto(path); await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('offline shell remains available while private API stays network-only', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', { name: 'AniVerse home' })).toBeVisible();
  const privateResult = await page.evaluate(async () => { try { await fetch('/api/profile'); return 'served'; } catch { return 'network-error'; } });
  expect(privateResult).toBe('network-error');
  await context.setOffline(false);
});
