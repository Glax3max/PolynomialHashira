import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../middlewares/auth.js";
import { ask, getChat, home } from "../controllers/chatController.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";

export const apiV1Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Keep this conservative for Functions (and to avoid large base64 payloads to the LLM)
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) return cb(null, true);
    const err = new Error("Only image uploads are allowed");
    // @ts-expect-error attach status code for our error handler
    err.statusCode = 400;
    return cb(err);
  }
});

// All endpoints require Firebase Bearer token
apiV1Router.use(requireAuth);

apiV1Router.get("/home", home);
// Accept both JSON (no image) and multipart/form-data (optional `image` file + `query` field)
apiV1Router.post("/ask", upload.single("image"), ask);
apiV1Router.get("/chats/:chat_id", getChat);
apiV1Router.get("/chats", getChat); // supports ?id=<chat_id>
apiV1Router.get("/profile", getProfile);
apiV1Router.put("/profile", updateProfile);

