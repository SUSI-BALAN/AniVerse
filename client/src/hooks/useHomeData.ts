import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useOptionalLibrary } from '../context/LibraryContext';
import { homeApi, type HomeSummary, type HomeScope } from '../services/homeApi';
import type { Recommendation } from '../services/insightsApi';

export function useHomeSummary() {
  const auth = useAuth(), library = useOptionalLibrary();
  const enabled = !auth.loading && (auth.mode === 'local' || Boolean(auth.user));
  const owner = auth.mode === 'local' ? 'local' : auth.user?.id ?? 'signed-out';
  const [stored, setStored] = useState<{ owner: string; data: HomeSummary } | null>(null), [loading, setLoading] = useState(enabled), [error, setError] = useState<string | null>(null), [slow, setSlow] = useState(false), [revision, setRevision] = useState(0), [activity, setActivity] = useState(0);
  const previous = useRef<{ owner: string; personal: string; activity: string; revision: number } | null>(null);
  const retry = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => { const invalidate = () => setActivity(v => v + 1); window.addEventListener('aniverse:progress-changed', invalidate); return () => window.removeEventListener('aniverse:progress-changed', invalidate); }, []);
  const personalKey = [library?.revisions.favorites, library?.revisions.watchlist, library?.revisions['recently-viewed']].join(':');
  const activityKey = [activity, library?.revisions['continue-watching'], library?.revisions['recently-completed']].join(':');
  useEffect(() => {
    if (!enabled) { setStored(null); setLoading(false); setError(null); setSlow(false); previous.current = null; return; }
    if (library?.loading) return;
    let active = true, timeout = false; const controller = new AbortController();
    const prior = previous.current;
    const scope: HomeScope = !prior || prior.owner !== owner || prior.revision !== revision ? 'all' : prior.activity !== activityKey ? 'activity' : 'personalized';
    const timer = window.setTimeout(() => {
      previous.current = { owner, personal: personalKey, activity: activityKey, revision };
      setLoading(true); setError(null); setSlow(false);
      homeApi.get(controller.signal, scope).then(data => { if (active) setStored(old => ({ owner, data: { ...(old?.owner === owner ? old.data : {}), ...data } })); }).catch(() => { if (active) setError(timeout ? 'The server is taking too long to respond. Please try again.' : 'Your home is temporarily unavailable. Please retry.'); }).finally(() => { if (active) { window.clearTimeout(slowTimer); window.clearTimeout(timeoutTimer); setLoading(false); setSlow(false); } });
    }, 100);
    const slowTimer = window.setTimeout(() => { if (active) setSlow(true); }, 4000);
    const timeoutTimer = window.setTimeout(() => { timeout = true; controller.abort(); }, 45000);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(slowTimer); window.clearTimeout(timeoutTimer); };
  }, [enabled, owner, library?.loading, personalKey, activityKey, revision]);
  return { enabled, data: stored?.owner === owner ? stored.data : null, loading, error, slow, retry, reasons: (rows?: Recommendation[]) => Object.fromEntries((rows ?? []).filter(r => r.reason).map(r => [r.anime.id, r.reason!])) };
}
