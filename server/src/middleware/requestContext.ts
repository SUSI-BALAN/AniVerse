import { randomUUID } from "node:crypto";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { logEvent, normalizeRoute, requestObservability } from '../utils/observability.js';

export function requestContext(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const received = request.header("x-request-id");
  request.requestId = received && /^[a-zA-Z0-9._-]{1,64}$/.test(received) ? received : randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  const started = performance.now();
  response.on("finish", () => logEvent(response.statusCode >= 500 ? 'error' : response.statusCode === 429 ? 'warn' : 'info', 'request.completed', { method: request.method, route: normalizeRoute(request.originalUrl), status: response.statusCode, ...(response.locals.errorCode ? { errorCode: response.locals.errorCode } : {}), durationMs: Math.round(performance.now() - started) }));
  requestObservability({ requestId: request.requestId, authenticated: false }, next);
}
