import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import { createApp } from "../app.js";

// Optional (but recommended): store your Gemini key as a Firebase Secret.
// This will be injected into `process.env.GEMINI_KEY` at runtime.
const GEMINI_KEY = defineSecret("GEMINI_KEY");

export const api = onRequest(
  {
    region: "us-central1",
    secrets: [GEMINI_KEY]
  },
  createApp()
);

