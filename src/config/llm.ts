import type { GenerativeModel } from "@google/generative-ai";
import connectToLLm from "../../connect/connectToLLM.js";
import { requireGeminiKey } from "./env.js";

let cachedModel: GenerativeModel | null = null;

export function getLlmModel() {
  if (cachedModel) return cachedModel;
  const apiKey = requireGeminiKey();
  cachedModel = connectToLLm(apiKey);
  return cachedModel;
}

