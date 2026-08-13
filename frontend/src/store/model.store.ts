import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelInfo, ModelSettings } from '../types';
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  DEFAULT_SETTINGS,
  SYSTEM_PROMPT_PRESETS,
} from '../services/model.service';

interface ModelStore {
  models: ModelInfo[];
  activeModelId: string;
  settings: ModelSettings;
  customPresets: Record<string, { label: string; prompt: string }>;

  setActiveModel: (modelId: string) => void;
  updateSettings: (patch: Partial<ModelSettings>) => void;
  setSystemPromptPreset: (presetKey: string) => void;
  saveCustomPreset: (label: string, prompt: string) => string;
  deleteCustomPreset: (id: string) => void;
  resetSettings: () => void;
  getActiveModel: () => ModelInfo | undefined;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      models: AVAILABLE_MODELS,
      activeModelId: DEFAULT_MODEL_ID,
      settings: DEFAULT_SETTINGS,
      customPresets: {},

      setActiveModel: (modelId) => {
        const model = AVAILABLE_MODELS.find(m => m.id === modelId);
        set(s => ({
          activeModelId: modelId,
          settings: {
            ...s.settings,
            contextLimit: model?.contextLimit ?? s.settings.contextLimit,
          },
        }));
      },

      updateSettings: (patch) =>
        set(s => ({ settings: { ...s.settings, ...patch } })),

      setSystemPromptPreset: (presetKey) => {
        const custom = get().customPresets[presetKey];
        const preset = custom || SYSTEM_PROMPT_PRESETS[presetKey];
        if (preset) {
          set(s => ({
            settings: {
              ...s.settings,
              systemPrompt: preset.prompt,
              systemPromptPreset: presetKey,
            },
          }));
        }
      },

      saveCustomPreset: (label, prompt) => {
        const id = `custom-${Date.now()}`;
        set(s => ({
          customPresets: {
            ...s.customPresets,
            [id]: { label, prompt }
          }
        }));
        return id;
      },

      deleteCustomPreset: (id) => {
        set(s => {
          const { [id]: _, ...rest } = s.customPresets;
          return { customPresets: rest };
        });
      },

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      getActiveModel: () => {
        const { models, activeModelId } = get();
        return models.find(m => m.id === activeModelId);
      },
    }),
    {
      name: 'ollama-model-store',
      // models list always comes from code; only persist user-chosen settings
      partialize: (state) => ({
        activeModelId: state.activeModelId,
        settings: state.settings,
        customPresets: state.customPresets,
      }),
    }
  )
);
