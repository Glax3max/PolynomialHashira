import crypto from "node:crypto";

import safeParseLLMResponse from "../../service/data_Cleaning.js";
import classifyQuery from "../../service/queryAnalyzer.js";
import { searchAndExtract } from "../../service/contextForQuery.js";

import { getLlmModel } from "../config/llm.js";
import { readDb, writeDb, type DbChat } from "./storage/fileDb.js";
import { generateAnswer } from "./answerService.js";
import type { HttpError } from "../types/http.js";

function isLatestQuery(query: string) {
  const q = query.toLowerCase();
  const hasLatestKeywords =
    q.includes("latest") ||
    q.includes("recent") ||
    q.includes("developments") ||
    q.includes("current") ||
    q.includes("updates") ||
    q.includes("newest");
  const hasYear = /\b20[0-9]{2}\b/.test(query);
  return { hasLatestKeywords, hasYear };
}

function extractSourcesFromContextResults(
  contextResults: Array<{ title?: string; content?: string }> | null | undefined
) {
  return (contextResults || []).map(r => ({
    title: r.title || "Untitled",
    excerpt: (r.content || "").slice(0, 280)
  }));
}

function contextResultsToContextString(
  contextResults: Array<{ title?: string; content?: string }> | null | undefined
) {
  if (!Array.isArray(contextResults) || contextResults.length === 0) return "";
  return contextResults
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.title || "Untitled"}]\n${result.content || ""}\n`;
    })
    .join("\n---\n\n");
}

function hasUncertainty(answer: string) {
  const uncertaintyIndicators = [
    "cannot provide",
    "do not have access",
    "cannot answer",
    "not yet occurred",
    "has not yet occurred",
    "cannot be detailed",
    "unable to",
    "no access",
    "real-time",
    "speculative",
    "knowledge cutoff",
    "prior to that date"
  ];
  const a = (answer || "").toLowerCase();
  return uncertaintyIndicators.some(indicator => a.includes(indicator));
}

function isRecentQuery(query: string) {
  const q = query.toLowerCase();
  return (
    q.includes("latest") ||
    q.includes("recent") ||
    q.includes("current") ||
    q.includes("newest") ||
    q.includes("updates") ||
    q.includes("developments") ||
    q.includes("2026") ||
    q.includes("2025") ||
    q.includes("2024")
  );
}

export async function createChatForQuery({ userId, query }: { userId: string; query: string }) {
  const model = getLlmModel();

  const { hasLatestKeywords, hasYear } = isLatestQuery(query);

  let decision: "DIRECT" | "SEARCH" = "DIRECT";
  if (hasLatestKeywords && hasYear) {
    decision = "SEARCH";
  } else {
    const routingRaw = await classifyQuery(query, model);
    const parsed = safeParseLLMResponse(routingRaw) as { decision?: "DIRECT" | "SEARCH" } | null;
    if (!parsed?.decision) {
      const err: HttpError = new Error("Failed to route query");
      err.statusCode = 500;
      throw err;
    }
    decision = parsed.decision;
  }

  let answer = "";
  let sources: Array<{ title: string; excerpt: string }> = [];
  let contextResults: Array<{ title?: string; content?: string; url?: string }> = [];

  if (decision === "SEARCH") {
    contextResults = (await searchAndExtract(query)) as typeof contextResults;
    sources = extractSourcesFromContextResults(contextResults);
    const contextString = contextResultsToContextString(contextResults);
    answer = await generateAnswer({ query, contextString, model });
  } else {
    answer = await generateAnswer({ query, contextString: "", model });

    // Fallback: if DIRECT seems uncertain for a recent query, retry with SEARCH
    if (hasUncertainty(answer) && isRecentQuery(query)) {
      contextResults = (await searchAndExtract(query)) as typeof contextResults;
      sources = extractSourcesFromContextResults(contextResults);
      const contextString = contextResultsToContextString(contextResults);
      answer = await generateAnswer({ query, contextString, model });
      decision = "SEARCH";
    }
  }

  const chat: DbChat = {
    chat_id: crypto.randomUUID(),
    user_id: userId,
    query,
    decision,
    answer,
    sources: decision === "SEARCH" ? sources : undefined,
    created_at: new Date().toISOString()
  };

  const db = await readDb();
  db.chats.push(chat);
  await writeDb(db);

  return chat;
}

export async function listChats({ userId, filter }: { userId: string; filter: string }) {
  const db = await readDb();
  let chats = db.chats.filter(c => c.user_id === userId);

  if (filter === "search") chats = chats.filter(c => c.decision === "SEARCH");
  if (filter === "direct") chats = chats.filter(c => c.decision === "DIRECT");

  chats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return chats.map(c => ({
    chat_id: c.chat_id,
    query: c.query,
    decision: c.decision,
    preview: (c.answer || "").slice(0, 160),
    created_at: c.created_at
  }));
}

export async function getChatById({ userId, chatId }: { userId: string; chatId: string }) {
  const db = await readDb();
  const chat = db.chats.find(c => c.chat_id === chatId && c.user_id === userId);
  if (!chat) {
    const err: HttpError = new Error("Chat not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    chat_id: chat.chat_id,
    query: chat.query,
    decision: chat.decision,
    answer: chat.answer,
    sources: chat.decision === "SEARCH" ? chat.sources || [] : undefined,
    created_at: chat.created_at
  };
}

