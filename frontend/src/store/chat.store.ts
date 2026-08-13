import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chat, Message, MessageBlock, OllamaMessage, Source } from '../types';
import { mockStreamChat, realStreamChat, fetchVisionDescription } from '../services/ollama.service';
import { estimateTokens, isVisionModel } from '../services/model.service';
import {
  computeActivePath,
  buildContextPath,
  buildOllamaMessagesFromPath,
  getSiblingsOf,
  getParentKey,
  migrateLinearMessages,
  ROOT_KEY,
} from '../services/branch.service';
import { useModelStore } from './model.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function parseContentToBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore) blocks.push({ id: uid(), type: 'text', content: textBefore });
    blocks.push({ id: uid(), type: 'code', language: match[1] || 'text', content: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex).trim();
  if (remaining) blocks.push({ id: uid(), type: 'text', content: remaining });
  if (blocks.length === 0 && content.trim())
    blocks.push({ id: uid(), type: 'text', content: content.trim() });
  return blocks;
}

function generateTitle(firstUserMessage: string): string {
  const truncated = firstUserMessage.slice(0, 50).trim();
  return truncated.length < firstUserMessage.length ? truncated + '...' : truncated;
}

export function getApiBase() {
  return ((import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

// ─── Date Revival ─────────────────────────────────────────────────────────────

function reviveDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function reviveMessage(m: Message): Message {
  return { ...m, createdAt: reviveDate(m.createdAt) };
}

function reviveChat(c: Chat): Chat {
  const messages = migrateLinearMessages(
    (c.messages ?? []).map(reviveMessage)
  );
  return {
    ...c,
    branchCursors: (c as any).branchCursors ?? {},
    createdAt: reviveDate(c.createdAt),
    updatedAt: reviveDate(c.updatedAt),
    messages,
  };
}

// ─── Streaming Helper ─────────────────────────────────────────────────────────

async function runStream(
  ollamaMessages: OllamaMessage[],
  modelId: string,
  signal: AbortSignal,
  onChunk: (text: string, done: boolean, evalCount?: number) => void,
  settings?: any
) {
  const { useConnectionStore } = await import('./connection.store');
  const conn = useConnectionStore.getState();
  const useReal = conn.status === 'connected' && conn.useRealMode;

  const stream = useReal
    ? realStreamChat(
        {
          model: modelId,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature: settings?.temperature,
            num_predict: settings?.maxTokens,
            num_ctx: settings?.contextLimit || 8192,
            top_p: settings?.topP ?? 0.9,
            top_k: settings?.topK ?? 40,
          },
        },
        conn.baseUrl,
        signal
      )
    : mockStreamChat(ollamaMessages, modelId, signal);

  let accumulated = '';
  let lastUpdate = Date.now();
  const UPDATE_INTERVAL = 64; 

  for await (const chunk of stream) {
    if (signal.aborted) break;
    accumulated += chunk.message.content;
    
    const now = Date.now();
    if (chunk.done || now - lastUpdate >= UPDATE_INTERVAL) {
      onChunk(accumulated, chunk.done, chunk.eval_count);
      lastUpdate = now;
    }
  }
  
  onChunk(accumulated, true);
  return accumulated;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface ChatStore {
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  abortController: AbortController | null;

  initialize: () => Promise<void>;
  createChat: (modelId?: string) => Promise<string>;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => void;
  pinChat: (chatId: string, pinned: boolean) => void;
  clearChat: (chatId: string) => void;
  setActiveChat: (chatId: string | null) => void;
  getActiveChat: () => Chat | null;

  sendMessage: (
    content: string,
    modelId: string,
    settings?: { temperature: number; maxTokens: number; contextLimit: number; systemPrompt: string; topP?: number; topK?: number },
    toolState?: { search?: boolean; files?: boolean; memory?: boolean },
    images?: string[]
  ) => Promise<void>;

  forkUserMessage: (
    chatId: string,
    fromMsgId: string,
    newContent: string,
    modelId: string,
    settings?: { temperature?: number; maxTokens?: number; contextLimit?: number; systemPrompt?: string; topP?: number; topK?: number }
  ) => Promise<void>;

  regenerateAssistant: (
    chatId: string,
    asstMsgId: string,
    modelId: string,
    settings?: { temperature?: number; maxTokens?: number; contextLimit?: number; systemPrompt?: string; topP?: number; topK?: number }
  ) => Promise<void>;

  transformMessage: (
    chatId: string,
    asstMsgId: string,
    instruction: string,
    modelId?: string,
    settings?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ) => Promise<void>;

  navigateBranch: (chatId: string, parentKey: string, delta: 1 | -1) => void;
  stopGeneration: () => void;
  pinMessage: (chatId: string, messageId: string, pinned: boolean) => void;
  getChatTokens: (chatId: string) => number;
  getTotalContextUsage: (chatId: string, contextLimit: number) => number;
  updateChatSystemPrompt: (chatId: string, prompt: string, presetKey?: string) => void;
  updateChatSettings: (chatId: string, patch: { contextLimit?: number; model?: string }) => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      const syncChat = async (chat: Chat) => {
        try {
          await fetch(`${getApiBase()}/api/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chat)
          });
        } catch (e) {}
      };

      const syncMessage = async (msg: Message) => {
        try {
          await fetch(`${getApiBase()}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg)
          });
        } catch (e) {}
      };

      return {
      chats: [],
      activeChatId: null,
      isStreaming: false,
      abortController: null,

      initialize: async () => {
        try {
          const res = await fetch(`${getApiBase()}/api/chats`);
          const chats = await res.json();
          // For each chat, we might want to fetch messages lazily or at once
          // For now, let's just populate the meta
          set({ chats: chats.map(reviveChat) });
        } catch (e) {}
      },

      createChat: async (modelId = 'llama3.2:3b') => {
        const id = uid();
        const settings = useModelStore.getState().settings;
        const newChat: Chat = { 
          id, title: 'New Chat', messages: [], model: modelId, createdAt: new Date(), updatedAt: new Date(), branchCursors: {},
          systemPrompt: settings.systemPrompt, systemPromptPreset: settings.systemPromptPreset,
          contextLimit: settings.contextLimit,
        };

        set(s => ({
          chats: [newChat, ...s.chats],
          activeChatId: id,
        }));
        await syncChat(newChat);
        return id;
      },

      deleteChat: (chatId) => {
        set(s => {
          const chats = s.chats.filter(c => c.id !== chatId);
          return { chats, activeChatId: s.activeChatId === chatId ? (chats[0]?.id ?? null) : s.activeChatId };
        });
        fetch(`${getApiBase()}/api/chats/${chatId}`, { method: 'DELETE' }).catch(() => {});
      },

      renameChat: (chatId, title) => {
        set(s => ({ chats: s.chats.map(c => c.id === chatId ? { ...c, title, updatedAt: new Date() } : c) }));
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) syncChat(chat);
      },

      pinChat: (chatId, pinned) => {
        set(s => ({ chats: s.chats.map(c => c.id === chatId ? { ...c, pinned } : c) }));
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) syncChat(chat);
      },

      clearChat: (chatId) => {
        set(s => ({ chats: s.chats.map(c => c.id === chatId ? { ...c, messages: [], branchCursors: {}, updatedAt: new Date() } : c) }));
        fetch(`${getApiBase()}/api/chats/${chatId}/messages`, { method: 'DELETE' }).catch(() => {});
      },

      setActiveChat: async (chatId) => {
        set({ activeChatId: chatId });
        if (chatId) {
          const existing = get().chats.find(c => c.id === chatId);
          const hasActiveStream = existing?.messages.some(m => m.status === 'thinking' || m.status === 'streaming');
          if (hasActiveStream || get().isStreaming) return;

          // Fetch full chat with messages
          try {
            const res = await fetch(`${getApiBase()}/api/chats/${chatId}`);
            const data = await res.json();
            if (data.chat && data.messages) {
              set(s => ({
                chats: s.chats.map(c => c.id === chatId ? { ...reviveChat(data.chat), messages: data.messages.map(reviveMessage) } : c)
              }));
            }
          } catch (e) {}
        }
      },

      getActiveChat: () => { const { chats, activeChatId } = get(); return chats.find(c => c.id === activeChatId) ?? null; },

      // ── sendMessage ───────────────────────────────────────────────────────────

      sendMessage: async (content, modelId, settings, toolState, images) => {
        let chatId = get().activeChatId;
        if (!chatId) chatId = await get().createChat(modelId);

        const chat = get().chats.find(c => c.id === chatId);
        if (!chat) return;

        const webTrigger = content.toLowerCase().startsWith('/web ') || content.toLowerCase().startsWith('/search ');
        const searchEnabled = toolState?.search || webTrigger;
        const filesEnabled = toolState?.files;

        const displayContent = webTrigger ? content.split(' ').slice(1).join(' ') : content;
        const searchQuery = displayContent;

        const activePath = computeActivePath(chat.messages, chat.branchCursors);
        const tipId = activePath[activePath.length - 1]?.id;

        const userMsgId = uid();
        const userMsg: Message = {
          id: userMsgId, chatId, role: 'user', content: displayContent,
          blocks: [{ id: uid(), type: 'text', content: displayContent }],
          status: 'completed', createdAt: new Date(),
          tokenCount: estimateTokens(displayContent),
          parentId: tipId,
          images: images,
        };

        const asstMsgId = uid();
        const asstMsg: Message = {
          id: asstMsgId, chatId, role: 'assistant', content: 'Connecting to model…', blocks: [],
          status: 'thinking', createdAt: new Date(),
          model: modelId, tokenCount: 0,
          parentId: userMsgId,
        };

        set(s => ({
          chats: s.chats.map(c => c.id !== chatId ? c : {
            ...c,
            messages: [...c.messages, userMsg, asstMsg],
            model: modelId,
            title: c.messages.length === 0 ? generateTitle(displayContent) : c.title,
            updatedAt: new Date(),
          }),
        }));

        const currentChat = get().chats.find(c => c.id === chatId);
        if (currentChat) syncChat(currentChat).catch(() => {});
        syncMessage(userMsg).catch(() => {});

        const patchAsst = (patch: Partial<Message>) => {
          set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, messages: c.messages.map(m => m.id === asstMsgId ? { ...m, ...patch } : m), updatedAt: new Date() }) }));
          const updated = get().chats.find(c => c.id === chatId)?.messages.find(m => m.id === asstMsgId);
          if (updated) syncMessage(updated);
        };

        let finalContext = displayContent;
        let sources: Source[] = [];
        let fileContext = '';
        let memoryContext = '';

        // 1. Fetch Memories
        try {
          const apiBase = getApiBase();
          const memRes = await fetch(`${apiBase}/api/memory`);
          const memories = await memRes.json();
          if (memories && memories.length > 0) {
            memoryContext = `\n\nRELEVANT BACKGROUND INFO:\n${memories.map((m: any) => `- ${m.content}`).join('\n')}`;
          }
        } catch (e) { console.warn('[Memory] Fetch failed'); }

        // 2. Local File Semantic Search (RAG)
        if (filesEnabled) {
          patchAsst({ status: 'thinking' });
          try {
            const apiBase = getApiBase();
            const res = await fetch(`${apiBase}/api/rag/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: searchQuery, limit: 10 })
            });
            const data = await res.json();
            if (data.results?.length > 0) {
              // Format semantic results
              fileContext = `\n\nRELEVANT CODE CHUNKS FOUND:\n${data.results.map((f: any) => `File: ${f.file_path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}`;
              sources = [...sources, ...data.results.map((f: any, idx: number) => ({
                id: `rag-${idx}`,
                title: f.file_path.split(/[\\/]/).pop() || f.file_path,
                url: f.file_path,
                domain: 'Project Context',
                snippet: `Semantic Match in ${f.file_path}`
              }))];
            }
          } catch (e) { console.error('[RAG Search] Failed'); }
        }

        // 3. Web Search
        let searchContextString = '';
        if (searchEnabled) {
          patchAsst({ status: 'thinking' });
          try {
            const apiBase = getApiBase();
            const res = await fetch(`${apiBase}/api/tools/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: searchQuery })
            });
            const data = await res.json();
            if (data.results?.length > 0) {
              const previousSourcesCount = chat.messages.reduce((sum, m) => sum + (m.sources?.length || 0), 0);
              const webSources = data.results.map((r: any, idx: number) => {
                let domain = 'web';
                try { domain = new URL(r.url).hostname; } catch {}
                return { id: `src-${previousSourcesCount + idx}`, title: r.title, url: r.url, domain, snippet: r.content };
              });
              sources = [...sources, ...webSources];
              searchContextString = data.results.map((r: any, i: number) => `[[Web Source ${previousSourcesCount + i + 1}]]: ${r.title}\nContent: ${r.content}`).join('\n\n');
            }
          } catch (e) { console.error('[Web Search] Failed'); }
        }

        // 4. Augment Prompt
        if (searchEnabled || filesEnabled || memoryContext) {
          finalContext = `
SYSTEM: You are a researcher and codebase expert.
${memoryContext}
${fileContext}
${searchContextString ? `\nWEB SEARCH RESULTS:\n${searchContextString}` : ''}

TASK: Answer "${displayContent}" using the context above. 
IMPORTANT: Always wrap code in triple backticks with the language tag (e.g. \`\`\`javascript) so it can be executed.
Cite sources like [[Web Source 1]] or [[File: path]].
`.trim();
        }

        patchAsst({ sources });

        const controller = new AbortController();
        set({ isStreaming: true, abortController: controller });

        const baseSystemPrompt = chat.systemPrompt ?? settings?.systemPrompt ?? 'You are a helpful AI assistant.';
        let enrichedSystemPrompt = `${baseSystemPrompt}${memoryContext}`;

        const { useConnectionStore } = await import('./connection.store');
        const conn = useConnectionStore.getState();

        // 5. Vision Handover (Multi-Model Orchestration)
        if (images && images.length > 0) {
          const currentModel = conn.installedModels.find(m => m.name === modelId || m.model === modelId);
          console.log('[Vision Handover] Checking current model:', currentModel?.name, 'Families:', currentModel?.details?.families);
          
          if (currentModel && !isVisionModel(currentModel)) {
            // Find a vision-capable fallback
            const visionFallback = conn.installedModels.find(m => isVisionModel(m));
            console.log('[Vision Handover] Fallback found:', visionFallback?.name);

            if (visionFallback) {
              patchAsst({ status: 'thinking', content: `[Analyzing ${images.length} image(s) using ${visionFallback.name}...]` });
              try {
                const description = await fetchVisionDescription(conn.baseUrl, visionFallback.name, images, undefined, controller.signal);
                finalContext = `
[VISUAL ANALYSIS FROM ${visionFallback.name.toUpperCase()}]:
${description}

[USER QUESTION]:
${finalContext || displayContent}
`.trim();
                patchAsst({ content: '', status: 'streaming' });
              } catch (e) {
                console.error('[Vision Handover] Failed', e);
                patchAsst({ content: `[Vision Analysis Failed: ${e instanceof Error ? e.message : 'Unknown error'}]`, status: 'thinking' });
                // Briefly show error then continue
                await new Promise(r => setTimeout(r, 2000));
                patchAsst({ content: '', status: 'thinking' });
              }
            } else {
              console.warn('[Vision Handover] No vision model found in installed models');
              patchAsst({ status: 'thinking', content: '[No vision model found. Sending image directly to text model...]' });
              await new Promise(r => setTimeout(r, 2000));
              patchAsst({ content: '', status: 'thinking' });
            }
          }
        }

        const currentModel = conn.installedModels.find(m => m.name === modelId || m.model === modelId);
        const isCurrentVision = currentModel ? isVisionModel(currentModel) : true;

        const augmentedUserMsg = { ...userMsg, content: finalContext || displayContent, images: userMsg.images };
        const contextPath = [...buildContextPath(chat.messages, tipId), augmentedUserMsg];
        const ollamaMessages = buildOllamaMessagesFromPath(contextPath, enrichedSystemPrompt, isCurrentVision);

        try {
          await runStream(ollamaMessages, modelId, controller.signal, (text, done, evalCount) => {
            patchAsst({
              content: text,
              status: done ? 'completed' : 'streaming',
              blocks: done ? parseContentToBlocks(text) : [],
              tokenCount: evalCount ?? estimateTokens(text),
            });
          }, { ...settings, contextLimit: chat.contextLimit ?? settings?.contextLimit });

          if (!controller.signal.aborted) {
             const userQuery = displayContent.toLowerCase();
             if (userQuery.includes('remember') || userQuery.includes('prefer') || userQuery.includes('my name is')) {
                const apiBase = getApiBase();
                await fetch(`${apiBase}/api/memory`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ content: displayContent })
                }).catch(() => {});
             }
          }
        } catch (err: any) {
          if (!controller.signal.aborted) {
            const errMsg = err?.message || 'Something went wrong. Please try again.';
            patchAsst({ status: 'error', content: `Error: ${errMsg}` });
          }
        } finally {
          set({ isStreaming: false, abortController: null });
        }
      },

      forkUserMessage: async (chatId, fromMsgId, newContent, modelId, settings) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (!chat) return;

        const targetUserMsg = chat.messages.find(m => m.id === fromMsgId);
        if (!targetUserMsg) return;

        const parentId = targetUserMsg.parentId;
        const userMsgId = uid();
        const userMsg: Message = {
          id: userMsgId, chatId, role: 'user', content: newContent,
          blocks: [{ id: uid(), type: 'text', content: newContent }],
          status: 'completed', createdAt: new Date(),
          tokenCount: estimateTokens(newContent),
          parentId: parentId,
        };

        const asstMsgId = uid();
        const asstMsg: Message = {
          id: asstMsgId, chatId, role: 'assistant', content: '', blocks: [],
          status: 'thinking', createdAt: new Date(),
          model: modelId, tokenCount: 0,
          parentId: userMsgId,
        };

        set(s => ({
          chats: s.chats.map(c => c.id !== chatId ? c : {
            ...c,
            messages: [...c.messages, userMsg, asstMsg],
            model: modelId,
            updatedAt: new Date(),
          }),
        }));

        await syncChat(get().chats.find(c => c.id === chatId)!);
        await syncMessage(userMsg);

        const patchAsst = (patch: Partial<Message>) => {
          set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, messages: c.messages.map(m => m.id === asstMsgId ? { ...m, ...patch } : m), updatedAt: new Date() }) }));
          const updated = get().chats.find(c => c.id === chatId)?.messages.find(m => m.id === asstMsgId);
          if (updated) syncMessage(updated);
        };

        const controller = new AbortController();
        set({ isStreaming: true, abortController: controller });

        const baseSystemPrompt = chat.systemPrompt ?? settings?.systemPrompt ?? 'You are a helpful AI assistant.';
        const contextPath = [...buildContextPath(chat.messages, parentId), userMsg];
        const ollamaMessages = buildOllamaMessagesFromPath(contextPath, baseSystemPrompt);

        try {
          await runStream(ollamaMessages, modelId, controller.signal, (text, done, evalCount) => {
            patchAsst({
              content: text,
              status: done ? 'completed' : 'streaming',
              blocks: done ? parseContentToBlocks(text) : [],
              tokenCount: evalCount ?? estimateTokens(text),
            });
          }, { ...settings, contextLimit: chat.contextLimit ?? settings?.contextLimit });
        } catch {
          if (!controller.signal.aborted) patchAsst({ status: 'error' });
        } finally {
          set({ isStreaming: false, abortController: null });
        }
      },

      regenerateAssistant: async (chatId, asstMsgId, modelId, settings) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (!chat) return;

        const targetAsstMsg = chat.messages.find(m => m.id === asstMsgId);
        if (!targetAsstMsg || !targetAsstMsg.parentId) return;

        const userMsg = chat.messages.find(m => m.id === targetAsstMsg.parentId);
        if (!userMsg) return;

        const newAsstMsgId = uid();
        const newAsstMsg: Message = {
          id: newAsstMsgId, chatId, role: 'assistant', content: '', blocks: [],
          status: 'thinking', createdAt: new Date(),
          model: modelId, tokenCount: 0,
          parentId: userMsg.id,
        };

        set(s => ({
          chats: s.chats.map(c => c.id !== chatId ? c : {
            ...c,
            messages: [...c.messages, newAsstMsg],
            model: modelId,
            updatedAt: new Date(),
          }),
        }));

        const patchAsst = (patch: Partial<Message>) => {
          set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, messages: c.messages.map(m => m.id === newAsstMsgId ? { ...m, ...patch } : m), updatedAt: new Date() }) }));
          const updated = get().chats.find(c => c.id === chatId)?.messages.find(m => m.id === newAsstMsgId);
          if (updated) syncMessage(updated);
        };

        const controller = new AbortController();
        set({ isStreaming: true, abortController: controller });

        const baseSystemPrompt = chat.systemPrompt ?? settings?.systemPrompt ?? 'You are a helpful AI assistant.';
        const contextPath = buildContextPath(chat.messages, userMsg.id);
        const ollamaMessages = buildOllamaMessagesFromPath(contextPath, baseSystemPrompt);

        try {
          await runStream(ollamaMessages, modelId, controller.signal, (text, done, evalCount) => {
            patchAsst({
              content: text,
              status: done ? 'completed' : 'streaming',
              blocks: done ? parseContentToBlocks(text) : [],
              tokenCount: evalCount ?? estimateTokens(text),
            });
          }, { ...settings, contextLimit: chat.contextLimit ?? settings?.contextLimit });
        } catch {
          if (!controller.signal.aborted) patchAsst({ status: 'error' });
        } finally {
          set({ isStreaming: false, abortController: null });
        }
      },

      transformMessage: async (chatId, asstMsgId, instruction, overrideModelId, settings) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (!chat) return;

        const targetAsstMsg = chat.messages.find(m => m.id === asstMsgId);
        if (!targetAsstMsg) return;

        const { useModelStore } = await import('./model.store');
        const activeModel = useModelStore.getState().activeModelId;
        const modelId = overrideModelId || targetAsstMsg.model || activeModel || chat.model;

        const transformPrompt = `Instruction: ${instruction}\n\nOriginal Text:\n${targetAsstMsg.content}`;
        const newAsstMsgId = uid();
        const newAsstMsg: Message = {
          id: newAsstMsgId, chatId, role: 'assistant', content: '', blocks: [],
          status: 'thinking', createdAt: new Date(),
          model: modelId, tokenCount: 0,
          parentId: targetAsstMsg.id,
        };

        set(s => ({
          chats: s.chats.map(c => c.id !== chatId ? c : {
            ...c,
            messages: [...c.messages, newAsstMsg],
            updatedAt: new Date(),
          }),
        }));

        const patchAsst = (patch: Partial<Message>) => {
          set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, messages: c.messages.map(m => m.id === newAsstMsgId ? { ...m, ...patch } : m), updatedAt: new Date() }) }));
          const updated = get().chats.find(c => c.id === chatId)?.messages.find(m => m.id === newAsstMsgId);
          if (updated) syncMessage(updated);
        };

        const controller = new AbortController();
        set({ isStreaming: true, abortController: controller });

        const baseSystemPrompt = 'You are a professional text editor. Transform the text following the user instructions.';
        const ollamaMessages: OllamaMessage[] = [{ role: 'user', content: transformPrompt }];

        try {
          await runStream(ollamaMessages, modelId, controller.signal, (text, done, evalCount) => {
            patchAsst({
              content: text,
              status: done ? 'completed' : 'streaming',
              blocks: done ? parseContentToBlocks(text) : [],
              tokenCount: evalCount ?? estimateTokens(text),
            });
          }, { ...settings });
        } catch {
          if (!controller.signal.aborted) patchAsst({ status: 'error' });
        } finally {
          set({ isStreaming: false, abortController: null });
        }
      },

      navigateBranch: (chatId, parentKey, delta) => {
        const chat = get().chats.find(c => c.id === chatId);
        if (!chat) return;
        const siblings = chat.messages.filter(m => getParentKey(m.parentId) === parentKey);
        if (siblings.length <= 1) return;
        const current = chat.branchCursors[parentKey] ?? 0;
        const next = Math.max(0, Math.min(current + delta, siblings.length - 1));
        if (next === current) return;
        set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, branchCursors: { ...c.branchCursors, [parentKey]: next } }) }));
        syncChat(get().chats.find(c => c.id === chatId)!);
      },

      stopGeneration: () => {
        get().abortController?.abort();
        set({ isStreaming: false, abortController: null });
      },
      pinMessage: (chatId, messageId, pinned) => {
        set(s => ({ chats: s.chats.map(c => c.id !== chatId ? c : { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, pinned } : m) }) }));
        const msg = get().chats.find(c => c.id === chatId)?.messages.find(m => m.id === messageId);
        if (msg) syncMessage(msg);
      },
      getChatTokens: (chatId) => {
        const chat = get().chats.find(c => c.id === chatId);
        return (chat?.messages ?? []).reduce((sum, m) => sum + (m.tokenCount ?? 0), 0);
      },
      getTotalContextUsage: (chatId, contextLimit) =>
        Math.min(get().getChatTokens(chatId) / contextLimit, 1),
      updateChatSystemPrompt: (chatId, prompt, presetKey) => {
        set(s => ({
          chats: s.chats.map(c => c.id === chatId ? { ...c, systemPrompt: prompt, systemPromptPreset: presetKey ?? 'custom', updatedAt: new Date() } : c)
        }));
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) syncChat(chat);
      },
      updateChatSettings: (chatId, patch) => {
        set(s => ({
          chats: s.chats.map(c => c.id === chatId ? { ...c, ...patch, updatedAt: new Date() } : c)
        }));
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) syncChat(chat);
      },
    }},
    {
      name: 'ollama-chat-store',
      partialize: (state) => ({ activeChatId: state.activeChatId }), // Only persist active ID, chats come from backend
      onRehydrateStorage: () => (state) => {
        if (state) state.initialize();
      },
    }
  )
);