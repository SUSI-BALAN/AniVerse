import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

const SearchPage = lazy(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const TrendingPage = lazy(() => import("./pages/TrendingPage").then((module) => ({ default: module.TrendingPage })));
const SeasonalPage = lazy(() => import("./pages/SeasonalPage").then((module) => ({ default: module.SeasonalPage })));
const BrowsePage = lazy(() => import("./pages/BrowsePage").then((module) => ({ default: module.BrowsePage })));
const AnimeDetailsPage = lazy(() => import("./pages/AnimeDetailsPage").then((module) => ({ default: module.AnimeDetailsPage })));
const WatchPage = lazy(() => import("./pages/WatchPage").then((module) => ({ default: module.WatchPage })));
const FavoritesPage = lazy(() => import("./pages/LibraryPages").then((module) => ({ default: module.FavoritesPage })));
const MyListPage = lazy(() => import("./pages/LibraryPages").then((module) => ({ default: module.MyListPage })));
const HistoryPage = lazy(() => import("./pages/LibraryPages").then((module) => ({ default: module.HistoryPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const StatsPage = lazy(() => import("./pages/StatsPage").then((module) => ({ default: module.StatsPage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({default:module.ProfilePage})));

export default function App() {
  return (
    <Suspense fallback={<div className="page-shell animate-pulse text-zinc-400">Loading AniVerse...</div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route path="/seasonal" element={<SeasonalPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/anime/:id" element={<AnimeDetailsPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/watch/:id/:episode" element={<ProtectedRoute><WatchPage /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/my-list" element={<ProtectedRoute><MyListPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
