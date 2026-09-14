import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useNetworkStatus } from './useNetworkStatus';
describe('useNetworkStatus', () => {
  beforeEach(() => Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }));
  it('tracks offline and online recovery', () => { const { result } = renderHook(() => useNetworkStatus()); expect(result.current).toBe(true); act(() => window.dispatchEvent(new Event('offline'))); expect(result.current).toBe(false); act(() => window.dispatchEvent(new Event('online'))); expect(result.current).toBe(true); });
});
