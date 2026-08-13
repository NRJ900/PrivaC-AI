import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionStatus, OllamaLocalModel, PullState } from '../types';
import {
  checkOllamaHealth,
  fetchOllamaModels,
  streamPullModel,
} from '../services/ollama.service';

// Module-level map so AbortControllers are never serialised into the store
const pullControllers = new Map<string, AbortController>();

interface ConnectionStore {
  status: ConnectionStatus;
  baseUrl: string;
  version: string | null;
  installedModels: OllamaLocalModel[];
  useRealMode: boolean;
  lastChecked: Date | null;
  pulls: Record<string, PullState>;

  /** Ping Ollama, update status + version + model list. */
  checkConnection: () => Promise<void>;
  /** Update the Ollama base URL and re-check. */
  setBaseUrl: (url: string) => void;
  /** Toggle between real Ollama and mock mode. */
  setUseRealMode: (enabled: boolean) => void;
  /** Re-fetch installed models without full health re-check. */
  refreshModels: () => Promise<void>;
  /** Pull a model, streaming progress into `pulls`. */
  pullModel: (name: string) => Promise<void>;
  /** Cancel an in-flight pull. */
  cancelPull: (name: string) => void;
  /** Remove a finished/failed pull record. */
  dismissPull: (name: string) => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      status: 'idle',
      baseUrl: 'http://localhost:3000',
      version: null,
      installedModels: [],
      useRealMode: true,
      lastChecked: null,
      pulls: {},

      checkConnection: async () => {
        const { baseUrl } = get();
        set({ status: 'checking' });

        try {
          const version = await checkOllamaHealth(baseUrl);
          const models = await fetchOllamaModels(baseUrl);
          set({
            status: 'connected',
            version,
            installedModels: models,
            lastChecked: new Date(),
          });
        } catch {
          set({ status: 'disconnected', version: null, installedModels: [], lastChecked: new Date() });
        }
      },

      setBaseUrl: (url) => {
        set({ baseUrl: url, status: 'idle', version: null, installedModels: [] });
        // Re-check after a tick so the UI updates first
        setTimeout(() => get().checkConnection(), 100);
      },

      setUseRealMode: (enabled) => set({ useRealMode: enabled }),

      refreshModels: async () => {
        const { baseUrl, status } = get();
        if (status !== 'connected') return;
        try {
          const models = await fetchOllamaModels(baseUrl);
          set({ installedModels: models });
        } catch {
          // silently ignore
        }
      },

      pullModel: async (name) => {
        const { baseUrl, pulls } = get();
        if (pulls[name]?.status === 'pulling') return; // already in progress

        const controller = new AbortController();
        pullControllers.set(name, controller);

        set(s => ({
          pulls: {
            ...s.pulls,
            [name]: { status: 'pulling', message: 'Starting…', total: 0, completed: 0, percent: 0 },
          },
        }));

        try {
          for await (const chunk of streamPullModel(baseUrl, name, controller.signal)) {
            if (controller.signal.aborted) break;

            if (chunk.error) {
              set(s => ({
                pulls: {
                  ...s.pulls,
                  [name]: {
                    status: 'error',
                    message: chunk.error!,
                    total: 0,
                    completed: 0,
                    percent: 0,
                    error: chunk.error,
                  },
                },
              }));
              return;
            }

            const isVerifying =
              chunk.status.startsWith('verifying') || chunk.status.startsWith('writing');
            const isSuccess = chunk.status === 'success';
            const total = chunk.total ?? 0;
            const completed = chunk.completed ?? 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : isSuccess ? 100 : 0;

            set(s => ({
              pulls: {
                ...s.pulls,
                [name]: {
                  status: isSuccess ? 'success' : isVerifying ? 'verifying' : 'pulling',
                  message: chunk.status,
                  total,
                  completed,
                  percent,
                },
              },
            }));

            if (isSuccess) {
              // Refresh the installed models list
              await get().refreshModels();
              return;
            }
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            const msg = err instanceof Error ? err.message : 'Pull failed';
            set(s => ({
              pulls: {
                ...s.pulls,
                [name]: { status: 'error', message: msg, total: 0, completed: 0, percent: 0, error: msg },
              },
            }));
          }
        } finally {
          pullControllers.delete(name);
        }
      },

      cancelPull: (name) => {
        const ctrl = pullControllers.get(name);
        ctrl?.abort();
        pullControllers.delete(name);
        set(s => {
          const pulls = { ...s.pulls };
          delete pulls[name];
          return { pulls };
        });
      },

      dismissPull: (name) => {
        set(s => {
          const pulls = { ...s.pulls };
          delete pulls[name];
          return { pulls };
        });
      },
    }),
    {
      name: 'ollama-connection-store',
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        useRealMode: state.useRealMode,
        // Don't persist connection status — always re-check on mount
      }),
    }
  )
);
