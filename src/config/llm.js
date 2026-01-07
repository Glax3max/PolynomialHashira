import connectToLLm from "../../connect/connectToLLM.js";
import { requireGeminiKey } from "./env.js";

let cachedModel = null;

export function getLlmModel() {
  if (cachedModel) return cachedModel;
  const apiKey = requireGeminiKey();
  cachedModel = connectToLLm(apiKey);
  return cachedModel;
}

