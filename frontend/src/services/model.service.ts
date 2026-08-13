import type { ModelInfo, ModelSettings } from '../types';

export const AVAILABLE_MODELS: ModelInfo[] = [];

export const DEFAULT_MODEL_ID = 'llama3.2:3b';

export const DEFAULT_SETTINGS: ModelSettings = {
  temperature: 0.7,
  maxTokens: 2048,
  contextLimit: 8192,
  topP: 0.9,
  topK: 40,
  systemPrompt: '',
  systemPromptPreset: 'default',
};

export const SYSTEM_PROMPT_PRESETS: Record<string, { label: string; prompt: string }> = {
  default: {
    label: 'Default',
    prompt: '',
  },
  developer: {
    label: 'Developer',
    prompt: 'You are an expert software engineer. Provide precise, production-ready code with clear explanations. Always include error handling and follow best practices. Prefer TypeScript over JavaScript when applicable.',
  },
  analyst: {
    label: 'Analyst',
    prompt: 'You are a data analyst and researcher. Provide structured, data-driven analysis. Use tables, bullet points, and clear headings to organize information. Be precise and cite assumptions.',
  },
  writer: {
    label: 'Writer',
    prompt: 'You are a professional writer and editor. Help craft clear, engaging, and well-structured content. Adapt your tone to the context and provide constructive feedback when reviewing.',
  },
  tutor: {
    label: 'Tutor',
    prompt: 'You are a patient and encouraging teacher. Break down complex topics into simple, digestible explanations. Use analogies and examples. Adjust your explanation depth based on the user\'s apparent level.',
  },
};

export function getModelById(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

export function isVisionModel(model: { name?: string, details?: { families?: string[] } }): boolean {
  const families = model.details?.families || [];
  const name = (model.name || '').toLowerCase();
  
  // Check families
  const hasVisionFamily = families.some(f => 
    ['projector', 'clip', 'vision', 'mllama', 'llava', 'moondream'].includes(f.toLowerCase())
  );
  if (hasVisionFamily) return true;

  // Check name as fallback
  return ['llava', 'moondream', 'vision', 'qwen-vl', 'minicpm-v'].some(k => name.includes(k));
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
