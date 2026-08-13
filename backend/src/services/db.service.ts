import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'privac.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT,
    model TEXT,
    systemPrompt TEXT,
    systemPromptPreset TEXT,
    contextLimit INTEGER,
    pinned INTEGER DEFAULT 0,
    branchCursors TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT,
    role TEXT,
    content TEXT,
    parentId TEXT,
    status TEXT,
    model TEXT,
    tokenCount INTEGER,
    sources TEXT,
    blocks TEXT,
    images TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chatId) REFERENCES chats(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS file_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT,
    content TEXT,
    embedding TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations
try { db.exec("ALTER TABLE chats ADD COLUMN contextLimit INTEGER;"); } catch (e) {}
try { db.exec("ALTER TABLE messages ADD COLUMN images TEXT;"); } catch (e) {}

export default db;
