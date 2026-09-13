import { describe,expect,it } from "vitest";
import { PostgresUserLibraryRepository } from "../src/repositories/postgres.repositories.js";
import type { Pool } from "pg";

describe("PostgreSQL repository ownership",()=>{
 it("scopes reads and deletes by authenticated user ID",async()=>{const calls:Array<{sql:string;values:unknown[]}>=[];const pool={query:async(sql:string,values:unknown[])=>{calls.push({sql,values});return{rows:[],rowCount:0};}} as unknown as Pool;const repository=new PostgresUserLibraryRepository(pool);await repository.favorites("user-a");await repository.removeFavorite("user-b",42);expect(calls[0].sql).toContain("WHERE user_id=$1");expect(calls[0].values).toEqual(["user-a"]);expect(calls[1].sql).toContain("user_id=$1 AND anilist_id=$2");expect(calls[1].values).toEqual(["user-b",42]);});
 it("never accepts an owner field from a favorite snapshot",async()=>{const calls:Array<{values:unknown[]}>=[];const pool={query:async(_sql:string,values:unknown[])=>{calls.push({values});return{rows:[],rowCount:1};}} as unknown as Pool;const repository=new PostgresUserLibraryRepository(pool);repository.favorite=async()=>({id:1,anilistId:9,title:"A",addedAt:"now"} as never);await repository.saveFavorite("verified-user",{anilistId:9,title:"A"});expect(calls[0].values[0]).toBe("verified-user");});
});
