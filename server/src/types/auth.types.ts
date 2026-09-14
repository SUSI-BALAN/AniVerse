import type { Request } from "express";

export type AuthUser = { id: string; email?: string | null; joinedAt?: string | null };
export type AuthenticatedRequest = Request & { authUser?: AuthUser; requestId?: string };
