import fs from 'fs/promises';
import path from 'path';

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
}

const MEMORY_FILE = path.resolve(process.cwd(), 'data', 'memory.json');

/**
 * Ensures the memory directory and file exist.
 */
async function ensureStorage() {
  const dir = path.dirname(MEMORY_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  try {
    await fs.access(MEMORY_FILE);
  } catch {
    await fs.writeFile(MEMORY_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Retrieves all stored memories.
 */
export async function getMemories(): Promise<MemoryItem[]> {
  await ensureStorage();
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    if (!data || !data.trim()) return [];
    return JSON.parse(data);
  } catch (e) {
    // Reset file if corrupted or empty
    await fs.writeFile(MEMORY_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

/**
 * Saves a new memory.
 */
export async function addMemory(content: string): Promise<MemoryItem> {
  await ensureStorage();
  const memories = await getMemories();
  
  const newItem: MemoryItem = {
    id: Math.random().toString(36).substring(2, 9),
    content,
    createdAt: new Date().toISOString()
  };

  memories.push(newItem);
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memories, null, 2));
  return newItem;
}

/**
 * Deletes a memory by ID.
 */
export async function deleteMemory(id: string): Promise<void> {
  const memories = await getMemories();
  const filtered = memories.filter(m => m.id !== id);
  await fs.writeFile(MEMORY_FILE, JSON.stringify(filtered, null, 2));
}
