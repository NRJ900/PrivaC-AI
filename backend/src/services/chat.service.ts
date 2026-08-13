import db from './db.service';

export interface Chat {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  systemPromptPreset?: string;
  contextLimit?: number;
  pinned: boolean;
  branchCursors: Record<string, number>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Message {
  id: string;
  chatId: string;
  role: string;
  content: string;
  parentId?: string;
  status: string;
  model?: string;
  tokenCount?: number;
  sources?: any[];
  blocks?: any[];
  images?: string[];
  createdAt: string | Date;
}

function toISO(d: string | Date): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return new Date().toISOString();
}

export const chatService = {
  // Get all chats (meta only)
  getAllChats(): Chat[] {
    const stmt = db.prepare('SELECT * FROM chats ORDER BY updatedAt DESC');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      ...r,
      pinned: !!r.pinned,
      branchCursors: JSON.parse(r.branchCursors || '{}')
    }));
  },

  // Get single chat with messages
  getChat(id: string): { chat: Chat; messages: Message[] } | null {
    const chatStmt = db.prepare('SELECT * FROM chats WHERE id = ?');
    const chat = chatStmt.get(id) as any;
    if (!chat) return null;

    const msgStmt = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC');
    const messages = msgStmt.all(id) as any[];

    return {
      chat: {
        ...chat,
        pinned: !!chat.pinned,
        branchCursors: JSON.parse(chat.branchCursors || '{}')
      },
      messages: messages.map(m => ({
        ...m,
        sources: JSON.parse(m.sources || '[]'),
        blocks: JSON.parse(m.blocks || '[]'),
        images: JSON.parse(m.images || '[]')
      }))
    };
  },

  // Create or update chat
  upsertChat(chat: any) {
    const stmt = db.prepare(`
      INSERT INTO chats (id, title, model, systemPrompt, systemPromptPreset, contextLimit, pinned, branchCursors, updatedAt, createdAt)
      VALUES (@id, @title, @model, @systemPrompt, @systemPromptPreset, @contextLimit, @pinned, @branchCursors, @updatedAt, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        model=excluded.model,
        systemPrompt=excluded.systemPrompt,
        systemPromptPreset=excluded.systemPromptPreset,
        contextLimit=excluded.contextLimit,
        pinned=excluded.pinned,
        branchCursors=excluded.branchCursors,
        updatedAt=excluded.updatedAt
    `);
    
    stmt.run({
      id: chat.id,
      title: chat.title || 'New Chat',
      model: chat.model || 'llama3',
      systemPrompt: chat.systemPrompt || '',
      systemPromptPreset: chat.systemPromptPreset || 'custom',
      contextLimit: chat.contextLimit || 8192,
      pinned: chat.pinned ? 1 : 0,
      branchCursors: JSON.stringify(chat.branchCursors || {}),
      updatedAt: toISO(chat.updatedAt),
      createdAt: toISO(chat.createdAt)
    });
  },

  // Delete chat
  deleteChat(id: string) {
    const stmt = db.prepare('DELETE FROM chats WHERE id = ?');
    stmt.run(id);
  },

  // Upsert Message
  upsertMessage(msg: any) {
    const stmt = db.prepare(`
      INSERT INTO messages (id, chatId, role, content, parentId, status, model, tokenCount, sources, blocks, images, createdAt)
      VALUES (@id, @chatId, @role, @content, @parentId, @status, @model, @tokenCount, @sources, @blocks, @images, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        content=excluded.content,
        status=excluded.status,
        tokenCount=excluded.tokenCount,
        sources=excluded.sources,
        blocks=excluded.blocks,
        images=excluded.images
    `);

    stmt.run({
      id: msg.id,
      chatId: msg.chatId,
      role: msg.role,
      content: msg.content || '',
      parentId: msg.parentId || null,
      status: msg.status || 'completed',
      model: msg.model || null,
      tokenCount: msg.tokenCount || 0,
      sources: JSON.stringify(msg.sources || []),
      blocks: JSON.stringify(msg.blocks || []),
      images: JSON.stringify(msg.images || []),
      createdAt: toISO(msg.createdAt)
    });
  },
  
  // Clear messages for a chat
  clearMessages(chatId: string) {
    const stmt = db.prepare('DELETE FROM messages WHERE chatId = ?');
    stmt.run(chatId);
  },

  // --- RAG Methods ---
  saveFileChunk(filePath: string, content: string, embedding: string) {
    const stmt = db.prepare('INSERT INTO file_chunks (file_path, content, embedding) VALUES (?, ?, ?)');
    stmt.run(filePath, content, embedding);
  },

  getAllFileChunks(): any[] {
    return db.prepare('SELECT * FROM file_chunks').all();
  },

  clearProjectIndex() {
    db.exec('DELETE FROM file_chunks');
  }
};
