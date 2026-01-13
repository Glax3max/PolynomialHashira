import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import type { Express } from "express";

// Optional (but recommended): store your Gemini key as a Firebase Secret.
// This will be injected into `process.env.GEMINI_KEY` at runtime.
const GEMINI_KEY = defineSecret("GEMINI_KEY");

// Lazily initialize the Express app.
// Firebase CLI loads user code to "discover" exports during deploy; doing heavy imports
// at module-load can exceed the 10s discovery timeout (especially on Windows).
let cachedApp: Express | null = null;

export const api = onRequest(
  {
    region: "us-central1",
    secrets: [GEMINI_KEY]
  },
  async (req, res) => {
    try {
      if (!cachedApp) {
        const mod = await import("../app.js");
        cachedApp = mod.createApp();
      }
      return cachedApp(req, res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize API app:", err);
      res.status(500).json({ error: "Server failed to initialize" });
    }
  }
);

