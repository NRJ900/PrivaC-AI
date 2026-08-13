import { create } from 'zustand';
import type { CompareSession, CompareResponse } from '../types';
import { mockStreamChat, realStreamChat } from '../services/ollama.service';
import { estimateTokens } from '../services/model.service';

function uid() { return crypto.randomUUID(); }

// Module-level abort controllers (not serialisable)
const abortControllers = new Map<string, AbortController>();

interface CompareStore {
  sessions: CompareSession[];
  activeSessionId: string | null;
  selectedModels: string[];
  isComparing: boolean;

  setSelectedModels: (models: string[]) => void;
  runComparison: (
    prompt: string,
    models: string[],
    settings?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ) => Promise<void>;
  stopComparison: () => void;
  clearSession: (id: string) => void;
  clearAll: () => void;
}

export const useCompareStore = create<CompareStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  selectedModels: [],
  isComparing: false,

  setSelectedModels: (models) => set({ selectedModels: models }),

  runComparison: async (prompt, models, settings) => {
    if (get().isComparing) return;

    const sessionId = uid();
    const now = Date.now();

    const responses: Record<string, CompareResponse> = {};
    models.forEach(m => {
      responses[m] = { modelId: m, content: '', status: 'thinking', tokenCount: 0, startedAt: now };
    });

    set(s => ({
      sessions: [{ id: sessionId, prompt, responses, createdAt: new Date() }, ...s.sessions],
      activeSessionId: sessionId,
      isComparing: true,
    }));

    const patch = (modelId: string, patch: Partial<CompareResponse>) =>
      set(s => ({
        sessions: s.sessions.map(sess =>
          sess.id !== sessionId ? sess : {
            ...sess,
            responses: { ...sess.responses, [modelId]: { ...sess.responses[modelId], ...patch } },
          }
        ),
      }));

    const { useConnectionStore } = await import('./connection.store');
    const conn = useConnectionStore.getState();
    const useReal = conn.status === 'connected' && conn.useRealMode;

    const streamModel = async (modelId: string) => {
      const ctrlKey = `${sessionId}-${modelId}`;
      const controller = new AbortController();
      abortControllers.set(ctrlKey, controller);

      const startedAt = Date.now();
      const msgs = [{ role: 'user' as const, content: prompt }];
      if (settings?.systemPrompt) msgs.unshift({ role: 'system' as const, content: settings.systemPrompt });

      let accumulated = '';

      try {
        patch(modelId, { status: 'streaming' });

        const stream = useReal
          ? realStreamChat(
              {
                model: modelId,
                messages: msgs,
                stream: true,
                options: {
                  temperature: settings?.temperature,
                  num_predict: settings?.maxTokens,
                },
              },
              conn.baseUrl,
              controller.signal
            )
          : mockStreamChat(msgs, modelId, controller.signal);

        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          accumulated += chunk.message.content;
          const now = Date.now();
          patch(modelId, {
            content: accumulated,
            status: chunk.done ? 'completed' : 'streaming',
            tokenCount: chunk.eval_count ?? estimateTokens(accumulated),
            completedAt: chunk.done ? now : undefined,
            durationMs: chunk.done ? now - startedAt : undefined,
          });
        }

        if (controller.signal.aborted && accumulated) {
          patch(modelId, { status: 'completed' });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          patch(modelId, { status: 'error' });
        }
      } finally {
        abortControllers.delete(ctrlKey);
      }
    };

    await Promise.all(models.map(streamModel));
    set({ isComparing: false });
  },

  stopComparison: () => {
    for (const ctrl of abortControllers.values()) ctrl.abort();
    abortControllers.clear();
    set({ isComparing: false });
  },

  clearSession: (id) => {
    set(s => {
      const sessions = s.sessions.filter(sess => sess.id !== id);
      return {
        sessions,
        activeSessionId: s.activeSessionId === id ? (sessions[0]?.id ?? null) : s.activeSessionId,
      };
    });
  },

  clearAll: () => set({ sessions: [], activeSessionId: null }),
}));
