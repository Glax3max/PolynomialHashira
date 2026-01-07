import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { ask, getChat, home } from "../controllers/chatController.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";

export const apiV1Router = Router();

// All endpoints require Firebase Bearer token
apiV1Router.use(requireAuth);

apiV1Router.get("/home", home);
apiV1Router.post("/ask", ask);
apiV1Router.get("/chats/:chat_id", getChat);
apiV1Router.get("/chats", getChat); // supports ?id=<chat_id>
apiV1Router.get("/profile", getProfile);
apiV1Router.put("/profile", updateProfile);

