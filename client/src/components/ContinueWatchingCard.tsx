import { Link } from "react-router-dom";
import { AnimeImage } from "./AnimeImage";
import { ProgressBar } from "./ProgressBar";
import type { EpisodeProgress } from "../types/progress";
export function ContinueWatchingCard({ item }: { item: EpisodeProgress }) { return <article className="w-52 shrink-0 overflow-hidden rounded-md border border-outline bg-surface"><AnimeImage src={item.coverImage} alt={`${item.title} cover`} className="h-72 w-full object-cover" /><div className="space-y-2 p-3"><h3 className="truncate font-bold text-foreground">{item.title}</h3><p className="text-xs text-muted">Episode {item.episodeNumber} · {Math.round(item.percentage)}%</p><ProgressBar value={item.percentage} label={`${item.title} progress`} /><Link to={`/watch/${item.anilistId}/${item.episodeNumber}`} className="inline-flex min-h-9 items-center text-sm font-bold text-accent hover:text-foreground">Resume</Link></div></article>; }
