import { getQueryFromBody } from "../models/queryModel.js";
import { createChatForQuery, getChatById, listChats } from "../services/chatService.js";

export async function home(req, res, next) {
  try {
    const filter = (req.query?.filter || "all").toString().toLowerCase();
    if (!["all", "search", "direct"].includes(filter)) {
      return res.status(400).json({ error: "`filter` must be one of: all, search, direct" });
    }

    const chats = await listChats({ userId: req.user.user_id, filter });
    return res.json({ title: "Your Previous Chats", chats });
  } catch (err) {
    return next(err);
  }
}

export async function ask(req, res, next) {
  try {
    const query = getQueryFromBody(req.body);
    const chat = await createChatForQuery({ userId: req.user.user_id, query });

    const response = {
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

export async function getChat(req, res, next) {
  try {
    const chatId = (req.params?.chat_id || req.query?.id || "").toString();
    if (!chatId) return res.status(400).json({ error: "`chat_id` is required" });

    const chat = await getChatById({ userId: req.user.user_id, chatId });
    return res.json(chat);
  } catch (err) {
    return next(err);
  }
}

