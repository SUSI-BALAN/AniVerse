import { randomUUID } from "node:crypto";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";

export function requestContext(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const received = request.header("x-request-id");
  request.requestId = received && /^[a-zA-Z0-9._-]{1,100}$/.test(received) ? received : randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  const started = performance.now();
  response.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: response.statusCode>=500?"error":"info", requestId: request.requestId, method: request.method, route: request.route?.path??"unmatched", status: response.statusCode, code:response.locals.errorCode, durationMs: Math.round(performance.now() - started) }));
  });
  next();
}
