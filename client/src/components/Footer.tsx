import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-outline pb-24 pt-9 md:pb-9">
      <div className="mx-auto flex max-w-page flex-col gap-5 px-4 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 xl:px-10">
        <div><p className="font-bold text-foreground">Ani<span className="text-accent">Verse</span></p><p className="mt-1 text-xs">Anime metadata powered by AniList.</p></div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation"><Link to="/browse" className="hover:text-foreground">Browse</Link><Link to="/trending" className="hover:text-foreground">Trending</Link><Link to="/seasonal" className="hover:text-foreground">Seasonal</Link><Link to="/favorites" className="hover:text-foreground">Favorites</Link><Link to="/settings" className="hover:text-foreground">Settings</Link></nav>
      </div>
    </footer>
  );
}
