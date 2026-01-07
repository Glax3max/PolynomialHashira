import type { HttpError } from "../types/domain.js";

export function getQueryFromBody(body: unknown): string {
  const query = (body as any)?.query as unknown;
  if (typeof query !== "string" || !query.trim()) {
    const err = new Error("`query` is required and must be a non-empty string") as HttpError;
    err.statusCode = 400;
    throw err;
  }
  return query.trim();
}

export function getContextFromBody(body: unknown): string {
  const context = (body as any)?.context as unknown;
  if (context == null) return "";
  if (typeof context !== "string") {
    const err = new Error("`context` must be a string when provided") as HttpError;
    err.statusCode = 400;
    throw err;
  }
  return context;
}

