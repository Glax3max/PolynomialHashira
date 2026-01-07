import connectToLLm from "../../connect/connectToLLM.js";
import { requireGeminiKey } from "./env.js";
import type { LlmModel } from "../types/domain.js";

let cachedModel: LlmModel | null = null;

export function getLlmModel(): LlmModel {
  if (cachedModel) return cachedModel;
  const apiKey = requireGeminiKey();
  cachedModel = connectToLLm(apiKey) as unknown as LlmModel;
  return cachedModel;
}

