import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { animeFixture } from '../test/fixtures';
import { useRecommendations } from '../hooks/useRecommendations';
import { useAnimePage } from '../hooks/useAnimePage';
import type { RecommendationHome } from '../services/insightsApi';
vi.mock('../hooks/useRecommendations'); vi.mock('../hooks/useAnimePage');
vi.mock('../services/insightsApi', () => ({ insightsApi: { stats: vi.fn().mockResolvedValue(null) } }));
vi.mock('../services/progressApi', () => ({ progressApi: { continueWatching: vi.fn().mockResolvedValue([]), recentlyCompleted: vi.fn().mockResolvedValue([]) } }));
const bundle: RecommendationHome = { recommendations: [{ anime: animeFixture, reason: 'Because you like Action', personalized: true }], because: null, continuations: [], meta: { personalized: true, partial: false, failedSources: 0 } };
function show(data: RecommendationHome | null = bundle, loading = false, error: string | null = null) { vi.mocked(useRecommendations).mockReturnValue({ data, loading, error, retry: vi.fn(), reasons: items => Object.fromEntries((items ?? []).filter(r => r.reason).map(r => [r.anime.id, r.reason!])) }); render(<MemoryRouter><HomePage /></MemoryRouter>); }
describe('recommendation reason and section presentation', () => {
  beforeEach(() => vi.mocked(useAnimePage).mockReturnValue({ anime: [], pagination: null, loading: false, error: null, retry: vi.fn() }));
  it('renders truthful personalized explanations visibly', () => { show(); expect(screen.getByRole('heading', { name: 'For You' })).toBeVisible(); expect(screen.getByText('Because you like Action')).toBeVisible(); expect(screen.queryByText('Picked from your local library')).not.toBeInTheDocument(); });
  it('labels catalog fallback honestly', () => { show({ ...bundle, meta: { ...bundle.meta, personalized: false } }); expect(screen.getByRole('heading', { name: 'Popular Picks' })).toBeVisible(); expect(screen.queryByRole('heading', { name: 'For You' })).not.toBeInTheDocument(); });
  it('keeps franchise explanations in a separate section', () => { show({ ...bundle, continuations: [{ anime: { ...animeFixture, id: 2 }, reason: 'Continue the series after Naruto', reasonType: 'continuation' }] }); expect(screen.getByRole('heading', { name: 'Continue the Series' })).toBeVisible(); expect(screen.getByText('Continue the series after Naruto')).toBeVisible(); });
  it('handles absent optional reasons without invented text', () => { show({ ...bundle, recommendations: [{ anime: animeFixture }] }); expect(screen.queryByText('Because you like Action')).not.toBeInTheDocument(); });
  it('renders loading, empty and safe retry states', () => { show(null, true, 'Unavailable'); expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible(); });
  it('shows a real empty state when no candidates remain', () => { show({ ...bundle, recommendations: [] }); expect(screen.getAllByText('No titles available').length).toBeGreaterThan(0); });
});
