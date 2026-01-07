import { getQueryFromBody } from "../models/queryModel.js";
import { createChatForQuery, getChatById, listChats } from "../services/chatService.js";
import type { NextFunction, Request, Response } from "express";

type HomeFilter = "all" | "search" | "direct";

export async function home(req: Request, res: Response, next: NextFunction) {
  try {
    const filterRaw = (req.query?.filter || "all").toString().toLowerCase();
    if (!["all", "search", "direct"].includes(filterRaw)) {
      return res.status(400).json({ error: "`filter` must be one of: all, search, direct" });
    }
    const filter = filterRaw as HomeFilter;

    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const chats = await listChats({ userId, filter });
    return res.json({ title: "Your Previous Chats", chats });
  } catch (err) {
    return next(err);
  }
}

export async function ask(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getQueryFromBody(req.body);
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const chat = await createChatForQuery({ userId, query });

    const response: any = {
      chat_id: chat.chat_id,
      decision: chat.decision,
      answer: chat.answer,
      created_at: chat.created_at
    };

    if (chat.decision === "SEARCH") {
      response.sources = chat.sources || [];
    }

    return res.json(response);
  } catch (err) {
    return next(err);
  }
}

export async function getChat(req: Request, res: Response, next: NextFunction) {
  try {
    const chatId = (req.params?.chat_id || req.query?.id || "").toString();
    if (!chatId) return res.status(400).json({ error: "`chat_id` is required" });

    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const chat = await getChatById({ userId, chatId });
    return res.json(chat);
  } catch (err) {
    return next(err);
  }
}

