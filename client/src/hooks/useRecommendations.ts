import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useOptionalLibrary } from '../context/LibraryContext';
import { insightsApi, type Recommendation, type RecommendationHome } from '../services/insightsApi';

export function useRecommendations() {
  const auth = useAuth(), library = useOptionalLibrary();
  const enabled = auth.mode === 'local' || Boolean(auth.user);
  const owner = auth.mode === 'local' ? 'local' : auth.user?.id ?? 'signed-out';
  const [stored, setStored] = useState<{ owner: string; data: RecommendationHome } | null>(null), [loading, setLoading] = useState(enabled), [error, setError] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => { window.addEventListener('aniverse:progress-changed', retry); return () => window.removeEventListener('aniverse:progress-changed', retry); }, [retry]);
  useEffect(() => {
    let active = true;
    if (!enabled) { setStored(null); setLoading(false); setError(null); return; }
    if (library?.loading) return () => { active = false; };
    // Coalesce rapid invalidations; cancelled effects never start a request or overwrite a new identity.
    const timer = window.setTimeout(() => {
      setLoading(true); setError(null);
      insightsApi.home().then(result => { if (active) setStored({ owner, data: result }); }).catch(() => { if (active) setError('Unable to load recommendations. Please retry.'); }).finally(() => { if (active) setLoading(false); });
    }, 100);
    return () => { active = false; window.clearTimeout(timer); };
  }, [enabled, owner, revision, library?.loading, library?.revisions.favorites, library?.revisions.watchlist, library?.revisions['recently-viewed'], library?.revisions['continue-watching'], library?.revisions['recently-completed']]);
  return { data: stored?.owner === owner ? stored.data : null, loading, error, retry, reasons: (items?: Recommendation[]) => Object.fromEntries((items ?? []).filter(r => r.reason).map(r => [r.anime.id, r.reason!])) };
}
