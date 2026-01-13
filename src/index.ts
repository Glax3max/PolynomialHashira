import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { fileURLToPath } from "node:url";

// Only start the HTTP listener when this file is executed directly.
// This prevents accidental server startup if the module is imported during tooling
// (e.g. Firebase Functions export discovery).
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const { PORT } = getEnv();
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

