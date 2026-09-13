import { env } from "../utils/env.js";
import { AnimeCacheRepository } from "./animeCache.repository.js";

export interface AnimeCacheRepositoryContract {
  get<T>(key: string, now?: Date): T | null;
  set(key: string, value: unknown, ttlSeconds: number, anilistId?: number | null): void;
}
export class MemoryAnimeCacheRepository implements AnimeCacheRepositoryContract {
  private entries = new Map<string, {value:unknown;expires:number}>();
  get<T>(key:string, now=new Date()):T|null {
    const item=this.entries.get(key);
    if (!item || item.expires<=now.getTime()) { this.entries.delete(key); return null; }
    return structuredClone(item.value) as T;
  }
  set(key:string,value:unknown,ttlSeconds:number) {
    this.entries.delete(key);
    if(this.entries.size>=1000)this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key,{value:structuredClone(value),expires:Date.now()+ttlSeconds*1000});
  }
}
const memory = new MemoryAnimeCacheRepository();
export function createAnimeCacheRepository():AnimeCacheRepositoryContract {
  return env.DATABASE_MODE === "postgres" ? memory : new AnimeCacheRepository();
}
