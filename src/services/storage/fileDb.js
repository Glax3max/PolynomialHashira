import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_PATH = process.env.DB_PATH || "./data/db.json";

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureDb(filePath) {
  await ensureDir(filePath);
  try {
    await fs.access(filePath);
  } catch {
    const initial = { users: {}, chats: [] };
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readDb() {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw || "{}");
  return {
    users: parsed.users || {},
    chats: Array.isArray(parsed.chats) ? parsed.chats : []
  };
}

export async function writeDb(db) {
  const filePath = path.resolve(DEFAULT_PATH);
  await ensureDb(filePath);
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
}

