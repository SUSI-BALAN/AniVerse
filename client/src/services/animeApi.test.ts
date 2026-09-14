import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchAnime } from './animeApi';

const body = { success: true, data: [], pagination: { page: 1, perPage: 20, total: 0, hasNextPage: false } };
afterEach(() => vi.unstubAllGlobals());
describe('catalog request deduplication', () => {
  it('shares one network request between two identical consumers', async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetcher);
    const a = searchAnime('shared request'), b = searchAnime('shared request');
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve(new Response(JSON.stringify(body)));
    const [first, second] = await Promise.all([a, b]);
    expect(first).toEqual(body); expect(second).toBe(first);
  });
  it('clears failed requests so a later retry can succeed', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetcher);
    const results = await Promise.allSettled([searchAnime('retry request'), searchAnime('retry request')]);
    expect(results.every((x) => x.status === 'rejected')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(searchAnime('retry request')).resolves.toEqual(body);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
