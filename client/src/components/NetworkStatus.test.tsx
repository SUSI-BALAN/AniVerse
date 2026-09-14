import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetworkStatus } from './NetworkStatus';
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: vi.fn() }));
import { useNetworkStatus } from '../hooks/useNetworkStatus';
describe('NetworkStatus', () => {
  it('announces offline state and provides retry', () => { vi.mocked(useNetworkStatus).mockReturnValue(false); render(<NetworkStatus />); expect(screen.getByRole('status')).toHaveTextContent(/offline/i); expect(() => act(() => screen.getByRole('button', { name: /retry/i }).click())).not.toThrow(); });
  it('does not occupy the page while online', () => { vi.mocked(useNetworkStatus).mockReturnValue(true); const { container } = render(<NetworkStatus />); expect(container).toBeEmptyDOMElement(); });
});
