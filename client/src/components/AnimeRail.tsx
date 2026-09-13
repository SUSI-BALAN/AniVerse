import type { Anime } from "../types/anime";
import { AnimeSection } from "./AnimeSection";

type AnimeRailProps = { title: string; anime: Anime[]; loading: boolean; href: string };

export function AnimeRail({ title, anime, loading, href }: AnimeRailProps) {
  return <AnimeSection title={title} anime={anime} loading={loading} viewAllLink={href} />;
}
