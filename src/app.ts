import express from "express";
import cors from "cors";

import { apiV1Router } from "./routes/apiV1.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { requireAuth } from "./middlewares/auth.js";
import { ask } from "./controllers/chatController.js";

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Support both base URLs:
  // - /api/v1  (matches examples)
  // - /api/v1/name (matches "Base URL" line)
  app.use("/api/v1", apiV1Router);
  app.use("/api/v1/name", apiV1Router);

  // Backwards-compatible alias (still requires auth)
  app.post("/ask", requireAuth, ask);

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

