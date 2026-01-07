import dotenv from "dotenv";
dotenv.config();
import express from "express"
import safeParseLLMResponse from "./service/data_Cleaning.js";
import classifyQuery from "./service/queryAnalyzer.js"
import connectToLLm from "./connect/connectToLLM.js";
import { searchAndExtract } from "./service/contextForQuery.js";
import axios from "axios"
import { QueryAnswer } from "./service/QuertAnswer.js";

// Initialize model with error handling
if (!process.env.Gemini_Key) {
  throw new Error("Gemini_Key environment variable is not set");
}
const model = connectToLLm(process.env.Gemini_Key);
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:false}))

app.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;
    console.log(`\n[DEBUG] Processing query: "${query}"`);
    
    // Pre-check: Force SEARCH for queries with "latest/recent/developments" + year
    const queryLower = query.toLowerCase();
    const hasLatestKeywords = queryLower.includes("latest") || queryLower.includes("recent") || 
                              queryLower.includes("developments") || queryLower.includes("current") ||
                              queryLower.includes("updates") || queryLower.includes("newest");
    const hasYear = /\b20[0-9]{2}\b/.test(query); // Matches any 4-digit year starting with 20
    
    let clean_output;
    if (hasLatestKeywords && hasYear) {
      console.log(`[DEBUG] Pre-check: Forcing SEARCH for query with latest keywords + year`);
      clean_output = 'SEARCH';
    } else {
      const data = await classifyQuery(query, model);
      console.log(`[DEBUG] Classification raw response:`, data);
      
      const parsedResponse = safeParseLLMResponse(data);
      console.log(`[DEBUG] Parsed classification:`, parsedResponse);
      
      if (!parsedResponse || !parsedResponse.decision) {
        throw new Error("Failed to parse query classification response");
      }
      
      clean_output = parsedResponse.decision;
      console.log(`[DEBUG] Decision: ${clean_output}`);
    }
    
    let answer;
    let context = [];
    
    if (clean_output == 'SEARCH') {
      console.log("SEARCH");
      context = await searchAndExtract(query);  // Only perform web search when needed
      console.log(`[DEBUG] Context results count: ${context.length}`);
      
      // Format context for LLM - create a readable string from the results
      let contextString = '';
      if (context.length > 0) {
        contextString = context.map((result, idx) => {
          return `[Source ${idx + 1}: ${result.title || 'Untitled'}]\n${result.content || ''}\n`;
        }).join('\n---\n\n');
        answer = await QueryAnswer(query, contextString, model);
      } else {
        console.log(`[DEBUG] No context retrieved from web search`);
        // If query contains future year and no results, modify the query for the LLM
        let queryToUse = query;
        if (hasYear && query.toLowerCase().includes('2025')) {
          queryToUse = query.replace(/\bin\s+2025\b/gi, 'recently').replace(/\b2025\b/g, '').trim();
          console.log(`[DEBUG] Modifying query for LLM: "${query}" -> "${queryToUse}"`);
        }
        // Use modified query but still pass empty context so LLM knows to use general knowledge
        answer = await QueryAnswer(queryToUse, contextString, model);
      }
    } else {
      // Double-check: If query has "latest/recent/developments" + year but was classified as DIRECT, force SEARCH
      if (hasLatestKeywords && hasYear) {
        console.log("[DEBUG] Override: Query has latest keywords + year but was DIRECT, forcing SEARCH");
        clean_output = 'SEARCH';
        context = await searchAndExtract(query);
        console.log(`[DEBUG] Context results count: ${context.length}`);
        
        // Format context for LLM
        let contextString = '';
        if (context.length > 0) {
          contextString = context.map((result, idx) => {
            return `[Source ${idx + 1}: ${result.title || 'Untitled'}]\n${result.content || ''}\n`;
          }).join('\n---\n\n');
        }
        
        answer = await QueryAnswer(query, contextString, model);
      } else {
        console.log("DIRECT");
        answer = await QueryAnswer(query, "", model);
        
        // Fallback: If DIRECT answer indicates uncertainty about recent/current information,
        // retry with web search to provide a better answer
        const uncertaintyIndicators = [
          "cannot provide",
          "do not have access",
          "cannot answer",
          "not yet occurred",
          "has not yet occurred",
          "cannot be detailed",
          "cannot be",
          "future",
          "predict",
          "do not have",
          "unable to",
          "no access",
          "real-time",
          "no latest",
          "cannot provide information",
          "speculative",
          "knowledge cutoff",
          "prior to that date"
        ];
        const answerLower = answer.toLowerCase();
        const queryLower = query.toLowerCase();
        const hasUncertainty = uncertaintyIndicators.some(indicator => answerLower.includes(indicator));
        const isRecentQuery = queryLower.includes("latest") || queryLower.includes("recent") || 
                              queryLower.includes("current") || queryLower.includes("2025") || 
                              queryLower.includes("2024") || queryLower.includes("newest") ||
                              queryLower.includes("updates") || queryLower.includes("developments");
        
        if (hasUncertainty && isRecentQuery) {
          console.log("[DEBUG] DIRECT answer shows uncertainty about recent info, retrying with SEARCH");
          context = await searchAndExtract(query);
          console.log(`[DEBUG] Context results count: ${context.length}`);
          if (context.length > 0) {
            // Format context for LLM
            let contextString = context.map((result, idx) => {
              return `[Source ${idx + 1}: ${result.title || 'Untitled'}]\n${result.content || ''}\n`;
            }).join('\n---\n\n');
            
            answer = await QueryAnswer(query, contextString, model);
            console.log("[DEBUG] Fallback SEARCH completed");
          } else {
            console.log("[DEBUG] Fallback SEARCH attempted but no context retrieved");
          }
        }
      }
    }
    
    console.log(`[DEBUG] Answer length: ${answer.length} characters\n`);
    res.json({ answer });  // Send actual result instead of "done"
  } catch (error) {
    console.error(`[ERROR]`, error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(3000, () => {
  console.log("Node server running on http://localhost:3000");
});
