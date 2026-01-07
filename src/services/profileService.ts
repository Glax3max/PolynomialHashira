import { readDb, writeDb } from "./storage/fileDb.js";
import type { UserProfile } from "../types/domain.js";

export async function getOrCreateProfile(user: {
  user_id: string;
  name?: string;
  email?: string;
}): Promise<UserProfile> {
  const db = await readDb();
  const existing = db.users[user.user_id];
  if (existing) return existing;

  const created: UserProfile = {
    user_id: user.user_id,
    name: user.name || "User",
    email: user.email || "",
    joined_at: new Date().toISOString()
  };

  db.users[user.user_id] = created;
  await writeDb(db);
  return created;
}

export async function updateProfileName(userId: string, name: unknown): Promise<true> {
  if (typeof name !== "string" || !name.trim()) {
    const err = new Error("`name` is required and must be a non-empty string") as Error & {
      statusCode?: number;
    };
    err.statusCode = 400;
    throw err;
  }

  const db = await readDb();
  const existing = db.users[userId];
  if (!existing) {
    const err = new Error("Profile not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  db.users[userId] = { ...existing, name: name.trim() };
  await writeDb(db);
  return true;
}

