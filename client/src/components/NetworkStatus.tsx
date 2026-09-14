import { RefreshCw, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function NetworkStatus() {
  const online = useNetworkStatus();
  if (online) return null;
  return <div role="status" aria-live="polite" className="fixed inset-x-0 top-16 z-50 border-b border-amber-300/20 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-100 shadow-lg"><span className="inline-flex items-center gap-2"><WifiOff size={16} aria-hidden="true" /> You’re offline. Cloud data needs a connection.</span><button type="button" onClick={() => window.location.reload()} className="ml-3 inline-flex min-h-8 items-center gap-1 rounded px-2 font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"><RefreshCw size={14} aria-hidden="true" /> Retry</button></div>;
}
