import { Link } from 'react-router-dom';
import { AnimeImage } from './AnimeImage';
import { ProgressBar } from './ProgressBar';
import type { EpisodeProgress } from '../types/progress';
export function ContinueWatchingCard({ item, showActivity = false }: { item: EpisodeProgress; showActivity?: boolean }) {
  const timestamp = item.completed ? item.completedAt : item.lastWatchedAt;
  const date = timestamp ? new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z') : null;
  return <article className="w-52 shrink-0 overflow-hidden rounded-md border border-outline bg-surface"><AnimeImage src={item.coverImage} alt={`${item.title} cover`} className="h-72 w-full object-cover" /><div className="space-y-2 p-3"><h3 className="truncate font-bold text-foreground">{item.title}</h3><p className="text-xs text-muted">Episode {item.episodeNumber} · {Math.round(item.percentage)}%</p><p className="text-xs text-muted">{item.completed ? 'Completed' : `Resume at ${Math.floor(item.currentTime / 60)}:${String(Math.floor(item.currentTime % 60)).padStart(2,'0')}`}</p>{showActivity && date && Number.isFinite(date.getTime()) && <p className="text-xs text-muted">{item.completed ? 'Completed' : 'Last watched'} <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time></p>}<ProgressBar value={item.percentage} label={`${item.title} progress`} /><Link to={`/watch/${item.anilistId}/${item.episodeNumber}`} className="inline-flex min-h-9 items-center text-sm font-bold text-accent hover:text-foreground">{item.completed ? 'Watch again' : 'Resume'}</Link></div></article>;
}
