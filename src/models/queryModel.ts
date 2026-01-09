import type { HttpError } from "../types/http.js";

export function getQueryFromBody(body: unknown) {
  const query = (body as Record<string, unknown> | null | undefined)?.query;
  if (typeof query !== "string" || !query.trim()) {
    const err: HttpError = new Error("`query` is required and must be a non-empty string");
    err.statusCode = 400;
    throw err;
  }
  return query.trim();
}

export function getContextFromBody(body: unknown) {
  const context = (body as Record<string, unknown> | null | undefined)?.context;
  if (context == null) return "";
  if (typeof context !== "string") {
    const err: HttpError = new Error("`context` must be a string when provided");
    err.statusCode = 400;
    throw err;
  }
  return context;
}

