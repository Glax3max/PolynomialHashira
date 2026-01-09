import fs from "node:fs/promises";
import path from "node:path";

export type DbUserProfile = {
  user_id: string;
  name: string;
  email: string;
  joined_at: string;
};

export type DbChat = {
  chat_id: string;
  user_id: string;
  query: string;
  decision: "DIRECT" | "SEARCH" | string;
  answer: string;
  sources?: Array<{ title: string; excerpt: string }>;
  created_at: string;
};

export type FileDb = {
  users: Record<string, DbUserProfile>;
  chats: DbChat[];
};

const DEFAULT_PATH = process.env.DB_PATH || "./data/db.json";

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureDb(filePath: string) {
  await ensureDir(filePath);
  try {
    await fs.access(filePath);
  } catch {
    const initial: FileDb = { users: {}, chats: [] };
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<FileDb> {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw || "{}") as Partial<FileDb>;
  return {
    users: parsed.users || {},
    chats: Array.isArray(parsed.chats) ? parsed.chats : []
  };
}

export async function writeDb(db: FileDb) {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
}

