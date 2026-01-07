import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerativeModel } from "@google/generative-ai";

export default function connectToLLm(api: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(api);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
}