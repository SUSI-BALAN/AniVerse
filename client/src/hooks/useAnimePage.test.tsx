import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAnimePage } from './useAnimePage';
import { animeFixture } from '../test/fixtures';
it('ignores query A when it finishes after query B even if the transport ignores abort', async () => {
  const pagination = { page: 1, perPage: 20, total: 1, hasNextPage: false };
  let finishA!: (value: {data: typeof animeFixture[]; pagination: typeof pagination}) => void;
  let signalA!: AbortSignal;
  const a = vi.fn((signal: AbortSignal) => { signalA = signal; return new Promise<{data: typeof animeFixture[]; pagination: typeof pagination}>((done) => { finishA = done; }); });
  const b = vi.fn(async () => ({ data: [{ ...animeFixture, id: 2 }], pagination }));
  const { result, rerender } = renderHook(({ query }) => useAnimePage(query === 'A' ? a : b, [query]), { initialProps: { query: 'A' } });
  await waitFor(() => expect(a).toHaveBeenCalledTimes(1));
  rerender({query: 'B'});
  await waitFor(() => expect(result.current.anime[0]?.id).toBe(2));
  expect(signalA.aborted).toBe(true);
  await act(async () => { finishA({data:[animeFixture],pagination}); });
  expect(result.current.anime[0].id).toBe(2);
});
