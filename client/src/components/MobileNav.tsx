import { LogIn, Search, Settings, ListVideo, Home, Compass } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function MobileNav() {
  const auth = useAuth();
  const final = auth.mode === "supabase" && !auth.user ? { href: "/login", label: "Sign In", icon: LogIn } : { href: "/settings", label: "Settings", icon: Settings };
  const items = [{ href: "/", label: "Home", icon: Home, end: true }, { href: "/browse", label: "Browse", icon: Compass }, { href: "/search", label: "Search", icon: Search }, { href: "/my-list", label: "My List", icon: ListVideo }, final];
  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline bg-[rgba(8,8,12,0.92)] pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
    <div className="mx-auto grid max-w-md grid-cols-5">
      {items.map((item) => <NavLink key={item.href} to={item.href} end={"end" in item ? item.end : false} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-accent-secondary" : "text-muted"}`}><item.icon size={18} aria-hidden="true" /><span>{item.label}</span></NavLink>)}
    </div>
  </nav>;
}
