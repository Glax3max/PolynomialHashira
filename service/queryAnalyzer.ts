import type { GenerativeModel } from "@google/generative-ai";

export default async function classifyQuery(query: string, model: GenerativeModel) {
  const prompt = `
### SYSTEM INSTRUCTIONS
You are a "Query Routing Agent." Your only job is to analyze a user's request and determine if the response requires a Web Search or if it can be answered accurately using your internal knowledge.

### DECISION CRITERIA
1. **SEARCH REQUIRED** if the query involves:
   - Real-time events, news, or weather (e.g., "What is happening in Tokyo right now?").
   - Data that changes frequently (e.g., stock prices, exchange rates).
   - Information about very recent product releases or software updates (after 2024).
   - Specific facts that require verified up-to-date sources (e.g., "Who won the game last night?").
   - Queries asking about "latest", "recent", "current", "newest", "updates", or "developments" (e.g., "What are the latest developments in X?", "What's the current status of Y?").
   - Any query explicitly asking about information from a specific recent year (2024, 2025, etc.) that requires current data.
   - **IMPORTANT**: If a query contains BOTH "latest" or "recent" or "developments" AND mentions a year (2024, 2025, etc.), it MUST be classified as SEARCH, even if the year seems future-dated. The user wants current information about that topic.

2. **DIRECT ANSWER** if the query involves:
   - General knowledge, history, or science (e.g., "How does photosynthesis work?").
   - Creative writing, coding help, or math (e.g., "Write a Python script for a calculator").
   - Opinions, advice, or general brainstorming.
   - Summarizing or analyzing text provided within the chat.
   - Well-established historical facts or scientific principles that don't change.

### OUTPUT FORMAT
You must respond with a JSON object in the following format:
{
  "reasoning": "A brief one-sentence explanation of why search is or is not needed.",
  "decision": "SEARCH" | "DIRECT"
}
query = ${query}
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

