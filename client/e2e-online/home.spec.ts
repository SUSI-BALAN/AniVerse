import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { token, users } from '../e2e/test-auth';
test('signed-out Home loads public sections without private API calls', async ({ page }) => {
  const reads: string[] = []; page.on('request', r => { const path = new URL(r.url()).pathname; if (path.startsWith('/api/') && r.method() === 'GET') reads.push(path); });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Trending Now', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View details for Naruto', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Popular', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top Rated', exact: true })).toBeVisible();
  await page.waitForTimeout(300); expect(reads.filter(p => !p.startsWith('/api/anime/') && p !== '/api/version')).toEqual([]);
  expect(reads.filter(p => p.startsWith('/api/anime/'))).toHaveLength(4);
  expect(await page.getByText(/Welcome back|Based on your library/).count()).toBe(0);
  console.info('SIGNED_OUT_HOME_GRAPH', JSON.stringify({ requests: reads.length, public: 4, private: 0, paths: reads }));
});
test('cloud Home greeting, progress and preference reasons stay isolated across A/B', async ({ page, request }) => {
  let owner = 0;
  const headers = (i: number) => ({ Authorization: 'Bearer ' + token(users[i], i ? 'b@example.com' : 'a@example.com') });
  await page.route('https://auth.test/**', r => r.request().url().includes('logout') ? r.fulfill({ status: 204 }) : r.fulfill({ json: { access_token: token(users[owner], owner ? 'b@example.com' : 'a@example.com'), token_type: 'bearer', expires_in: 3600, refresh_token: randomUUID(), user: { id: users[owner], email: owner ? 'b@example.com' : 'a@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } } }));
  for (const i of [0,1]) {
    await request.patch('http://127.0.0.1:4176/api/profile', { headers: headers(i), data: { displayName: i ? 'Home B' : 'Home A', avatarId: 'avatar-01' } });
    await request.post('http://127.0.0.1:4176/api/favorites', { headers: headers(i), data: { anilistId: i ? 202 : 201, title: i ? 'Romance Source' : 'Action Source', genres: [i ? 'Romance' : 'Action'] } });
    await request.put(`http://127.0.0.1:4176/api/progress/${710+i}/1`, { headers: headers(i), data: { title: i ? 'B Resume' : 'A Resume', currentTime: 50, duration: 100, totalEpisodes: 12 } });
  }
  try {
    for (owner = 0; owner < 2; owner++) {
      await page.goto('/login'); await page.getByLabel('Email').fill(owner ? 'b@example.com' : 'a@example.com'); await page.getByLabel('Password', { exact: true }).fill(randomUUID()); await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true }).first()).toBeVisible();
      await page.goto('/'); await expect(page.getByText('Welcome back, Home ' + (owner ? 'B' : 'A'))).toBeVisible();
      await expect(page.getByRole('heading', { name: owner ? 'B Resume' : 'A Resume', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: owner ? 'A Resume' : 'B Resume', exact: true })).toHaveCount(0);
      await expect(page.getByText('Similar to your favorite ' + (owner ? 'Romance' : 'Action') + ' Source')).toBeVisible();
      await expect(page.getByText('Welcome back, Home ' + (owner ? 'A' : 'B'))).toHaveCount(0);
      await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    }
  } finally { for (const i of [0,1]) { await request.delete(`http://127.0.0.1:4176/api/favorites/${i ? 202 : 201}`, { headers: headers(i) }); await request.delete(`http://127.0.0.1:4176/api/progress/${710+i}`, { headers: headers(i) }); } }
});
