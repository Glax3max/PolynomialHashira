
export async function QueryAnswer(query,context,model) {
    const prompt = `
    You are a helpful and accurate assistant.

        You may be provided with:
        - A USER QUESTION
        - Optional CONTEXT retrieved from external sources

        Follow these rules strictly:

        1. If the CONTEXT is present AND contains information relevant to the USER QUESTION:
        - Use the CONTEXT to answer the question.
        - At the end of your answer, add a section titled "Sources".
        - In "Sources", list short citations derived ONLY from the provided CONTEXT.
        - Do NOT invent or assume sources.

        2. If the CONTEXT is empty, missing, or NOT relevant to the USER QUESTION:
        - Answer the question using only your own general knowledge.
        - Do NOT include a "Sources" section.
        - Do NOT mention the absence of context.

        3. Never mix general knowledge with CONTEXT-based facts.
        If you use the CONTEXT, rely on it as the primary source.

        4. Do NOT mention words like "context", "retrieved data", "RAG", or "documents" in your answer.

        5. Be concise, factual, and clear.
        If information is uncertain, state uncertainty rather than guessing.

        6. If the u do not have answer then use the context provided below to answer the query
        ---

        CONTEXT:
        ${context}

        ---

        USER QUESTION:
        ${query}

        ---

        ANSWER:
    `
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}