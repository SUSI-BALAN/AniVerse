import { expect, test } from '@playwright/test';
import { token, users } from '../e2e/test-auth';
test('isolated cloud recommendation explanations stay owner-scoped', async ({ page, request }) => {
  await page.route('https://example.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64') }));
  let owner = 0;
  await page.route('https://auth.test/**', r => {
    if (r.request().url().includes('logout')) return r.fulfill({ status: 204 });
    const email = owner ? 'b@example.com' : 'a@example.com', id = users[owner];
    return r.fulfill({ json: { access_token: token(id, email), token_type: 'bearer', expires_in: 3600, refresh_token: id, user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } } });
  });
  for (const [i, id, title, genre] of [[0, 201, 'Action Source', 'Action'], [1, 202, 'Romance Source', 'Romance']] as const) {
    const headers = { Authorization: `Bearer ${token(users[i], i ? 'b@example.com' : 'a@example.com')}` };
    expect((await request.post('http://127.0.0.1:4176/api/favorites', { headers, data: { anilistId: id, title, genres: [genre] } })).status()).toBe(201);
  }
  try {
    for (owner = 0; owner < 2; owner++) {
      await page.goto('/login'); await page.getByLabel('Email').fill(owner ? 'b@example.com' : 'a@example.com'); await page.getByLabel('Password', { exact: true }).fill('isolated-fixture-only'); await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.goto('/'); await expect(page.getByText(`Similar to your favorite ${owner ? 'Romance' : 'Action'} Source`)).toBeVisible();
      await expect(page.getByText(`Similar to your favorite ${owner ? 'Action' : 'Romance'} Source`)).toHaveCount(0);
      await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    }
  } finally {
    for (const [i, id] of [[0, 201], [1, 202]] as const) await request.delete(`http://127.0.0.1:4176/api/favorites/${id}`, { headers: { Authorization: `Bearer ${token(users[i], i ? 'b@example.com' : 'a@example.com')}` } });
  }
});
