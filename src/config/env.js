import dotenv from "dotenv";

dotenv.config();

export function getEnv() {
  const geminiKey = process.env.Gemini_Key || process.env.GEMINI_KEY;
  const portRaw = process.env.PORT;

  const port = portRaw ? Number(portRaw) : 3000;

  return {
    GEMINI_KEY: geminiKey,
    PORT: Number.isFinite(port) ? port : 3000
  };
}

export function requireGeminiKey() {
  const { GEMINI_KEY } = getEnv();
  if (!GEMINI_KEY) {
    throw new Error("Gemini_Key (or GEMINI_KEY) environment variable is not set");
  }
  return GEMINI_KEY;
}

