export function getQueryFromBody(body) {
  const query = body?.query;
  if (typeof query !== "string" || !query.trim()) {
    const err = new Error("`query` is required and must be a non-empty string");
    err.statusCode = 400;
    throw err;
  }
  return query.trim();
}

export function getContextFromBody(body) {
  const context = body?.context;
  if (context == null) return "";
  if (typeof context !== "string") {
    const err = new Error("`context` must be a string when provided");
    err.statusCode = 400;
    throw err;
  }
  return context;
}

