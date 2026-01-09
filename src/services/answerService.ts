import type { GenerativeModel } from "@google/generative-ai";

export async function generateAnswer({
  query,
  contextString,
  model
}: {
  query: string;
  contextString: string;
  model: GenerativeModel;
}) {
  const hasContext = typeof contextString === "string" && contextString.trim().length > 0;

  const prompt = `
You are a helpful and accurate assistant.

You may be provided with:
- A USER QUESTION
- Optional EXCERPTS from external sources

Rules:
1) If EXCERPTS are present and relevant, use them to answer.
2) If EXCERPTS are empty or not relevant, answer using general knowledge.
3) Do NOT mention EXCERPTS, sources, documents, or browsing in your reply.
4) Keep the answer concise, factual, and clear.

EXCERPTS:
${hasContext ? contextString : ""}

USER QUESTION:
${query}

ANSWER:
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

