import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";
import { logEvent, normalizeRoute, serializeError } from '../utils/observability.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  response.locals.errorCode=error instanceof AppError?error.code:error instanceof ZodError?"VALIDATION_ERROR":"INTERNAL_ERROR";
  const requestId = (request as typeof request & { requestId?: string }).requestId;
  const diagnostic = process.env.NODE_ENV === "production" && requestId ? { requestId } : {};
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "The backup contains invalid JSON.", ...diagnostic } });
    return;
  }
  if (typeof error === "object" && error !== null && "status" in error && error.status === 413) {
    response.status(413).json({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "The request payload is too large.", ...diagnostic } });
    return;
  }
  if (error instanceof ZodError) {
    logEvent('info','validation.failed',{route:normalizeRoute(request.path),errorCode:'VALIDATION_ERROR',invalidFields:[...new Set(error.issues.map(issue=>String(issue.path[0]??'request')).filter(field=>/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(field)))]});
    response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "The request contains invalid values.",
        ...diagnostic
      }
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...diagnostic }
    });
    return;
  }

  logEvent('error','request.failed',{route:normalizeRoute(request.path),errorCode:'INTERNAL_ERROR',error:serializeError(error)});
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "AniVerse encountered an unexpected error.", ...diagnostic }
  });
};
