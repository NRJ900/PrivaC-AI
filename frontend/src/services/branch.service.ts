import type { Message, OllamaMessage } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Key used in branchCursors for root-level messages (parentId === undefined). */
export const ROOT_KEY = '$root';

export function getParentKey(parentId: string | undefined): string {
  return parentId ?? ROOT_KEY;
}

// ─── Active Path ──────────────────────────────────────────────────────────────

/**
 * Compute the ordered list of messages currently visible in the chat thread,
 * following branchCursors at every fork point.
 */
export function computeActivePath(
  messages: Message[],
  branchCursors: Record<string, number>
): Message[] {
  // Group messages by their parent key
  const childrenOf = new Map<string, Message[]>();

  for (const msg of messages) {
    const key = getParentKey(msg.parentId);
    const group = childrenOf.get(key);
    if (group) group.push(msg);
    else childrenOf.set(key, [msg]);
  }

  // Sort each group oldest-first
  for (const group of childrenOf.values()) {
    group.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }

  const path: Message[] = [];
  let currentKey = ROOT_KEY;

  while (true) {
    const children = childrenOf.get(currentKey);
    if (!children || children.length === 0) break;

    const cursor = branchCursors[currentKey] ?? 0;
    const selected = children[Math.min(cursor, children.length - 1)];
    path.push(selected);
    currentKey = selected.id;
  }

  return path;
}

// ─── Sibling Queries ──────────────────────────────────────────────────────────

/** All siblings of a message (same parentId), sorted by createdAt. */
export function getSiblingsOf(messages: Message[], messageId: string): Message[] {
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return [];
  const key = getParentKey(msg.parentId);
  return messages
    .filter(m => getParentKey(m.parentId) === key)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

/** { index, total } of a message among its siblings. */
export function getBranchPosition(
  messages: Message[],
  messageId: string
): { index: number; total: number } {
  const siblings = getSiblingsOf(messages, messageId);
  const index = siblings.findIndex(m => m.id === messageId);
  return { index: Math.max(index, 0), total: siblings.length };
}

// ─── Context Building ─────────────────────────────────────────────────────────

/**
 * Walk the parentId chain from `throughId` up to the root,
 * returning messages in chronological order (root → throughId).
 */
export function buildContextPath(
  messages: Message[],
  throughId: string | undefined
): Message[] {
  if (!throughId) return [];

  const path: Message[] = [];
  let currentId: string | undefined = throughId;

  while (currentId !== undefined) {
    const msg = messages.find(m => m.id === currentId);
    if (!msg) break;
    path.unshift(msg);
    currentId = msg.parentId;
  }

  return path;
}

// ─── Ollama Message Formatting ────────────────────────────────────────────────

export function buildOllamaMessagesFromPath(
  contextMessages: Message[],
  systemPrompt?: string,
  includeImages = true
): OllamaMessage[] {
  const result: OllamaMessage[] = [];
  if (systemPrompt) result.push({ role: 'system', content: systemPrompt });

  for (const m of contextMessages) {
    if (m.status === 'completed' || m.role === 'user') {
      const msg: OllamaMessage = {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      };
      if (includeImages && m.images && m.images.length > 0) {
        msg.images = m.images;
      }
      result.push(msg);
    }
  }
  return result;
}

// ─── Migration ────────────────────────────────────────────────────────────────

/**
 * Convert a flat linear message array (no parentId) into a linked chain.
 * Idempotent — if messages[1] already has parentId set, returns as-is.
 */
export function migrateLinearMessages(messages: Message[]): Message[] {
  if (messages.length <= 1) return messages;
  // If second message already has parentId, the list is already migrated
  if (messages[1]?.parentId !== undefined) return messages;

  return messages.map((msg, i) => ({
    ...msg,
    parentId: i === 0 ? undefined : messages[i - 1].id,
  }));
}
