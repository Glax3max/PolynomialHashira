import { getFirebaseAdmin } from "../config/firebase.js";

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
}

export async function requireAuth(req, res, next) {
  try {
    if (process.env.AUTH_DISABLED === "true") {
      req.user = {
        user_id: "dev-user",
        email: "dev@example.com",
        name: "Dev User"
      };
      return next();
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      user_id: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || decoded.email || "User"
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

