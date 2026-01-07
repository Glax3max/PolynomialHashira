
export default function safeParseLLMResponse(rawString) {
    try {
        // 1. Try to find JSON inside markdown blocks or just the raw braces
        const jsonMatch = rawString.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error("No JSON structure found in response");
        }

        const cleanJson = jsonMatch[0];
        
        // 2. Parse the cleaned string
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Failed to parse LLM response:", error);
        return null;
    }
}
