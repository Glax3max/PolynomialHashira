import fs from "node:fs/promises";
import path from "node:path";
import type { DbShape } from "../../types/domain.js";

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
    const initial: DbShape = { users: {}, chats: [] };
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DbShape> {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw || "{}") as Partial<DbShape>;
  return {
    users: parsed.users || {},
    chats: Array.isArray(parsed.chats) ? parsed.chats : []
  };
}

export async function writeDb(db: DbShape): Promise<void> {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
}

