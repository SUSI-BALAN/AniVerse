import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from './env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Context = { requestId: string; authenticated: boolean };
type Fields = Record<string, unknown>;
const context = new AsyncLocalStorage<Context>();
const blocked = /^(authorization|cookie|set-cookie|password|token|access_token|refresh_token|database_url|service_role|service_role_key|supabase_anon_key)$/i;
let testSink: ((line: string) => void) | null = null;

const cleanString = (value: string) => value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').slice(0, 240);
export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return cleanString(value);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 50).map(item => redact(item, seen));
  return Object.fromEntries(Object.entries(value as Fields).slice(0, 50).map(([key, item]) => [key, blocked.test(key) ? '[redacted]' : redact(item, seen)]));
}
export function normalizeRoute(path: string) {
  return path.split('?')[0].replace(/\/[0-9]+(?=\/|$)/g, '/:id').replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:id').slice(0, 160);
}
export function requestObservability<T>(value: Context, work: () => T) { return context.run(value, work); }
export function markAuthenticated() { const current = context.getStore(); if (current) current.authenticated = true; }
export function currentRequestId() { return context.getStore()?.requestId; }
export function serializeError(error: unknown) {
  if (!(error instanceof Error)) return { name: 'UnknownError', code: 'INTERNAL_ERROR' };
  const code = typeof (error as Error & { code?: unknown }).code === 'string' ? (error as Error & { code: string }).code : 'INTERNAL_ERROR';
  return { name: cleanString(error.name), code: cleanString(code), ...(env.NODE_ENV === 'development' ? { message: cleanString(error.message), stack: cleanString(error.stack ?? '') } : {}) };
}
export function logEvent(level: Level, event: string, fields: Fields = {}) {
  if (level === 'debug' && env.NODE_ENV === 'production') return;
  if (env.NODE_ENV === 'test' && !testSink) return;
  const current = context.getStore();
  const record = redact({ timestamp: new Date().toISOString(), level, event, ...(current ? { requestId: current.requestId, authenticated: current.authenticated } : {}), ...fields });
  const line = JSON.stringify(record);
  if (testSink) testSink(line); else (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
export function setObservabilitySinkForTests(sink: ((line: string) => void) | null) { testSink = sink; }
