import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

const { PORT } = getEnv();

const app = createApp();
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on http://localhost:${PORT}`);
});

