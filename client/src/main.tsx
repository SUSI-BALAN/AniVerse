import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LibraryProvider } from "./context/LibraryContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import "./styles/index.css";
import {ErrorBoundary} from "./components/ErrorBoundary";
import {ConfigurationGuard} from "./auth/ConfigurationGuard";
import { NetworkStatus } from './components/NetworkStatus';
import { registerPwa } from './pwa';

function PwaRuntime() { const [update, setUpdate] = React.useState(false); const [apply, setApply] = React.useState<(() => void) | null>(null); React.useEffect(() => registerPwa(fn => { setApply(() => fn); setUpdate(true); }), []); return <>{update && <div role="status" aria-live="polite" className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border border-outline bg-surface p-3 text-sm text-foreground shadow-lg"><span>New version available.</span><button type="button" onClick={() => apply?.()} className="min-h-9 rounded bg-accent px-3 font-bold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-secondary">Refresh</button></div>}<NetworkStatus /></>; }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary><ConfigurationGuard><AuthProvider><BrowserRouter><PrivateState><PwaRuntime /><App /></PrivateState></BrowserRouter></AuthProvider></ConfigurationGuard></ErrorBoundary>
  </React.StrictMode>
);

function PrivateState({children}:{children:React.ReactNode}){const auth=useAuth();return<LibraryProvider key={auth.user?.id??auth.mode}>{children}</LibraryProvider>;}
