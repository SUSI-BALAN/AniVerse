import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'public');
describe('PWA static policy', () => {
  it('has a valid install manifest and local icons', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8')) as { name: string; short_name: string; start_url: string; scope: string; display: string; icons: Array<{ src: string; sizes: string; purpose?: string }> };
    expect(manifest.name).toContain('AniVerse'); expect(manifest.short_name).toBe('AniVerse'); expect(manifest.start_url).toBe('/'); expect(manifest.scope).toBe('/'); expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: '192x192' }), expect.objectContaining({ sizes: '512x512', purpose: expect.stringContaining('maskable') })]));
    for (const icon of manifest.icons) expect(readFileSync(resolve(root, icon.src.slice(1)), 'utf8')).toContain('<svg');
  });
  it('never caches API, Authorization or Supabase traffic and bounds runtime cache', () => {
    const worker = readFileSync(resolve(root, 'sw.js'), 'utf8');
    expect(worker).toContain("url.pathname.startsWith('/api/')"); expect(worker).toContain("request.headers.get('Authorization')"); expect(worker).toContain("url.origin.includes('supabase.co')"); expect(worker).toContain('MAX_RUNTIME_ENTRIES'); expect(worker).toContain('SKIP_WAITING');
  });
  it('uses an offline shell fallback only for navigation', () => { const worker = readFileSync(resolve(root, 'sw.js'), 'utf8'); expect(worker).toContain("caches.match('/index.html')"); expect(worker).toContain("request.mode === 'navigate'"); });
});
