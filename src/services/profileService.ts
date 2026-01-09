import type { Request } from "express";
import type { HttpError } from "../types/http.js";
import { readDb, writeDb, type DbUserProfile } from "./storage/fileDb.js";

type RequestUser = NonNullable<Request["user"]>;

export async function getOrCreateProfile(user: RequestUser): Promise<DbUserProfile> {
  const db = await readDb();
  const existing = db.users[user.user_id];
  if (existing) return existing;

  const created: DbUserProfile = {
    user_id: user.user_id,
    name: user.name || "User",
    email: user.email || "",
    joined_at: new Date().toISOString()
  };

  db.users[user.user_id] = created;
  await writeDb(db);
  return created;
}

export async function updateProfileName(userId: string, name: unknown) {
  if (typeof name !== "string" || !name.trim()) {
    const err: HttpError = new Error("`name` is required and must be a non-empty string");
    err.statusCode = 400;
    throw err;
  }

  const db = await readDb();
  const existing = db.users[userId];
  if (!existing) {
    const err: HttpError = new Error("Profile not found");
    err.statusCode = 404;
    throw err;
  }

  db.users[userId] = { ...existing, name: name.trim() };
  await writeDb(db);
  return true;
}

