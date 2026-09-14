import { LogOut, Search, Settings, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { href: "/", label: "Home", end: true },
  { href: "/browse", label: "Browse" },
  { href: "/trending", label: "Trending" },
  { href: "/seasonal", label: "Seasonal" },
  { href: "/my-list", label: "My List", wide: true },
  { href: "/favorites", label: "Favorites", wide: true },
  { href: "/history", label: "History", wide: true }
];

export function Navbar() {
  const auth = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-[rgba(8,8,12,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-page items-center px-4 sm:px-6 lg:px-8 xl:px-10">
        <NavLink to="/" className="mr-8 flex items-baseline font-black text-foreground" aria-label="AniVerse home">
          <span className="text-xl">Ani</span><span className="text-xl text-accent">Verse</span><span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent-secondary" />
        </NavLink>
        <nav className="hidden h-full flex-1 items-center gap-6 md:flex" aria-label="Primary navigation">
          {navItems.filter((item) => auth.mode === "local" || auth.user || !["/my-list", "/favorites", "/history"].includes(item.href)).map((item) => (
            <NavLink key={item.href} to={item.href} end={item.end} className={({ isActive }) => `${item.wide ? "hidden xl:flex" : "flex"} relative h-full items-center text-sm font-medium transition-colors ${isActive ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent" : "text-muted hover:text-foreground"}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <NavIcon to="/search" label="Search"><Search size={19} /></NavIcon>
          {(auth.mode === 'local' || auth.user) && <NavIcon to="/profile" label="Profile"><UserRound size={19} /></NavIcon>}
          {(auth.mode === "local" || auth.user) && <NavIcon to="/settings" label="Settings"><Settings size={19} /></NavIcon>}
          {auth.mode === "supabase" && !auth.user && <NavIcon to="/login" label="Sign in"><UserRound size={19} /></NavIcon>}
          {auth.mode === "supabase" && auth.user && <button type="button" onClick={() => void auth.signOut()} aria-label="Sign out" title="Sign out" className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-soft hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><LogOut size={18} /></button>}
        </div>
      </div>
    </header>
  );
}

function NavIcon({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return <NavLink to={to} aria-label={label} title={label} className={({ isActive }) => `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${isActive ? "bg-white/10 text-accent-secondary" : "text-muted hover:bg-white/5 hover:text-foreground"}`}>{children}</NavLink>;
}
