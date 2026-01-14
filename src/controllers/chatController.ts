import type { NextFunction, Request, Response } from "express";
import { getQueryFromBody } from "../models/queryModel.js";
import { createChatForQuery, getChatById, listChats } from "../services/chatService.js";

export async function home(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = (req.query?.filter || "all").toString().toLowerCase();
    if (!["all", "search", "direct"].includes(filter)) {
      return res.status(400).json({ error: "`filter` must be one of: all, search, direct" });
    }

    const chats = await listChats({ userId: req.user!.user_id, filter });
    return res.json({ title: "Your Previous Chats", chats });
  } catch (err) {
    return next(err);
  }
}

export async function ask(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getQueryFromBody(req.body);
    const imageFile = (req as Request & { file?: Express.Multer.File }).file;
    const image =
      imageFile && imageFile.buffer
        ? {
            mimeType: imageFile.mimetype || "application/octet-stream",
            dataBase64: imageFile.buffer.toString("base64"),
            size: imageFile.size || imageFile.buffer.length
          }
        : undefined;

    const chat = await createChatForQuery({ userId: req.user!.user_id, query, image });

    const response: {
      chat_id: string;
      decision: string;
      answer: string;
      created_at: string;
      sources?: Array<{ title: string; excerpt: string }>;
      has_image?: boolean;
    } = {
      chat_id: chat.chat_id,
      decision: chat.decision,
      answer: chat.answer,
      created_at: chat.created_at
    };

    if (chat.decision === "SEARCH") {
      response.sources = chat.sources || [];
    }
    if (chat.has_image) {
      response.has_image = true;
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

    const chat = await getChatById({ userId: req.user!.user_id, chatId });
    return res.json(chat);
  } catch (err) {
    return next(err);
  }
}

