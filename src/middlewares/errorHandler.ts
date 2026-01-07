import type { NextFunction, Request, Response } from "express";
import type { HttpError } from "../types/domain.js";

export function notFound(req: Request, res: Response) {
  return res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  void req;
  void next;
  const e = err as HttpError;
  const status = e?.statusCode && Number.isInteger(e.statusCode) ? e.statusCode : 500;
  const message = status >= 500 ? "Internal server error" : e?.message || "Request failed";
  if (status >= 500) {
    // Avoid leaking internals but keep server logs useful
    console.error("[ERROR]", err);
  }
  return res.status(status).json({ error: message });
}

