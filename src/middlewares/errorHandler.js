export function notFound(req, res) {
  return res.status(404).json({ error: "Not found" });
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  void next;
  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = status >= 500 ? "Internal server error" : err?.message || "Request failed";
  if (status >= 500) {
    // Avoid leaking internals but keep server logs useful
    // eslint-disable-next-line no-console
    console.error("[ERROR]", err);
  }
  return res.status(status).json({ error: message });
}

