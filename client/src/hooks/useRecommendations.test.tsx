import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecommendations } from './useRecommendations';
import { insightsApi, type RecommendationHome } from '../services/insightsApi';
import { animeFixture } from '../test/fixtures';
const state = vi.hoisted(() => ({ auth: { mode: 'local', user: null as { id: string } | null }, library: { revisions: { favorites: 0, watchlist: 0, 'recently-viewed': 0 } } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('../context/LibraryContext', () => ({ useOptionalLibrary: () => state.library }));
vi.mock('../services/insightsApi', () => ({ insightsApi: { home: vi.fn() } }));
const data = (label = 'Because you like Action'): RecommendationHome => ({ recommendations: [{ anime: animeFixture, reason: label, personalized: true }], because: null, continuations: [], meta: { personalized: true, partial: false, failedSources: 0 } });
function Probe() { const r = useRecommendations(); return <><p>{r.loading ? 'Loading' : 'Ready'}</p><p>{r.error}</p><p>{r.reasons(r.data?.recommendations)[1]}</p><button onClick={r.retry}>Retry</button></>; }
describe('focused recommendation invalidation', () => {
  beforeEach(() => { vi.clearAllMocks(); state.auth = { mode: 'local', user: null }; state.library.revisions = { favorites: 0, watchlist: 0, 'recently-viewed': 0 }; vi.mocked(insightsApi.home).mockResolvedValue(data()); });
  it('loads reasons without fetching full collections', async () => { render(<Probe />); expect(screen.getByText('Loading')).toBeInTheDocument(); expect(await screen.findByText('Because you like Action')).toBeInTheDocument(); expect(insightsApi.home).toHaveBeenCalledTimes(1); });
  it('shows safe errors and supports retry', async () => { vi.mocked(insightsApi.home).mockRejectedValueOnce(new Error('raw private detail')); render(<Probe />); await screen.findByText('Unable to load recommendations. Please retry.'); screen.getByText('Retry').click(); await screen.findByText('Because you like Action'); expect(screen.queryByText('raw private detail')).not.toBeInTheDocument(); });
  it('reloads only recommendations after favorite and progress invalidation', async () => { const { rerender } = render(<Probe />); await screen.findByText('Because you like Action'); state.library.revisions.favorites++; rerender(<Probe />); await waitFor(() => expect(insightsApi.home).toHaveBeenCalledTimes(2)); act(() => window.dispatchEvent(new Event('aniverse:progress-changed'))); await waitFor(() => expect(insightsApi.home).toHaveBeenCalledTimes(3)); });
  it('does not load private recommendations when signed out', async () => { state.auth.mode = 'supabase'; render(<Probe />); await screen.findByText('Ready'); expect(insightsApi.home).not.toHaveBeenCalled(); });
  it('ignores an old response after a new identity loads', async () => { let finish!: (r: RecommendationHome) => void; state.auth = { mode: 'supabase', user: { id: 'a' } }; vi.mocked(insightsApi.home).mockImplementationOnce(() => new Promise(r => { finish = r; })).mockResolvedValue(data('Because you like Romance')); const { rerender } = render(<Probe />); await waitFor(() => expect(insightsApi.home).toHaveBeenCalledTimes(1)); state.auth.user = { id: 'b' }; rerender(<Probe />); await screen.findByText('Because you like Romance'); act(() => finish(data('Because you like Action'))); expect(screen.queryByText('Because you like Action')).not.toBeInTheDocument(); });
});
