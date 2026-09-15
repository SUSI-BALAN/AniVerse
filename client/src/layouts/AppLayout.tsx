import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "../components/Footer";
import { MobileNav } from "../components/MobileNav";
import { Navbar } from "../components/Navbar";
import { PageTransition } from "../components/PageTransition";
import { ScrollToTop } from "../components/ScrollToTop";
import { useMotionPreference } from "../hooks/useMotionPreference";

export function routeName(path: string) {
  if (path.startsWith('/anime/')) return 'Anime details';
  if (path.startsWith('/watch/')) return 'Watch';
  return ({'/':'Home','/browse':'Browse','/search':'Search','/profile':'Profile','/favorites':'Favorites','/my-list':'My List','/history':'History','/settings':'Settings','/stats':'Statistics','/trending':'Trending','/seasonal':'Seasonal','/login':'Sign in','/register':'Create account'} as Record<string,string>)[path] ?? 'Page not found';
}
function RouteContent({ ready }: { ready: (path: string) => void }) {
  const { pathname } = useLocation();
  useEffect(() => ready(pathname), [pathname, ready]);
  return <PageTransition><Outlet /></PageTransition>;
}
export function AppLayout() {
  const main = useRef<HTMLElement>(null), previous = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const reduced = useMotionPreference();
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
    return () => { delete document.documentElement.dataset.reducedMotion; };
  }, [reduced]);
  const ready = useCallback((path: string) => {
    if (previous.current === path) return;
    if (previous.current !== null) main.current?.focus({ preventScroll: true });
    previous.current = path;
    const name = routeName(path);
    document.title = name + ' | AniVerse';
    setAnnouncement(name + ' page loaded');
  }, []);
  return <div className="flex min-h-screen flex-col text-foreground">
    <a href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView({ behavior: 'instant' }); }} className="skip-link">Skip to main content</a>
    <ScrollToTop /><Navbar />
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-route-announcement>{announcement}</div>
    <main id="main-content" ref={main} tabIndex={-1} className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <Suspense fallback={<div className="page-shell" role="status">Loading AniVerse…</div>}><RouteContent ready={ready} /></Suspense>
    </main>
    <Footer /><MobileNav />
  </div>;
}
