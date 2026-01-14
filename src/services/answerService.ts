import type { GenerativeModel } from "@google/generative-ai";

export async function generateAnswer({
  query,
  contextString,
  model,
  image
}: {
  query: string;
  contextString: string;
  model: GenerativeModel;
  image?: {
    mimeType: string;
    dataBase64: string;
  };
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

  // If an image is provided, send a multimodal request (image + prompt).
  // We keep the prompt as the text part so existing behavior stays the same for text-only calls.
  const input = image?.dataBase64
    ? ([
        { inlineData: { mimeType: image.mimeType, data: image.dataBase64 } },
        { text: prompt }
      ] as unknown)
    : prompt;

  // @ts-expect-error SDK accepts multimodal parts but types vary by version
  const result = await model.generateContent(input);
  return result.response.text().trim();
}

