import {apiFetch} from './apiClient';
import type {LibraryAnime,WatchlistStatus} from '../types/library';
export type Collection='favorites'|'watchlist'|'recently-viewed'|'watch-history'|'continue-watching'|'recently-completed';
export type LibraryEntry=LibraryAnime & {id?:number;viewCount?:number;date?:string;status?:WatchlistStatus;episodeNumber?:number;currentTime?:number;duration?:number;percentage?:number;completed?:boolean;watchedAt?:string;lastWatchedAt?:string};
export type LibraryPage={items:LibraryEntry[];page:number;pageSize:number;total:number;totalPages:number;genres:string[]};
export type Membership={favoriteIds:number[];watchlist:{anilistId:number;status:WatchlistStatus}[];recentlyViewedCount:number};
async function get<T>(path:string,signal?:AbortSignal):Promise<T>{const response=await apiFetch(path,{signal});if(!response.ok)throw new Error('Unable to load your library. Please try again.');return (await response.json() as {data:T}).data;}
export const libraryQueryApi={page:(collection:Collection,params:URLSearchParams,signal?:AbortSignal)=>get<LibraryPage>(`/api/library/${collection}?${params}`,signal),membership:()=>get<Membership>('/api/library-membership')};
