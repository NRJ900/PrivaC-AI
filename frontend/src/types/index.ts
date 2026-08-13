// ─── Core Message Types ──────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'idle' | 'thinking' | 'streaming' | 'completed' | 'error';

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

export interface CodeBlock {
  id: string;
  type: 'code';
  language: string;
  content: string;
  filename?: string;
}

export interface FileBlock {
  id: string;
  type: 'file';
  filename: string;
  fileType: string;
  size?: number;
  url?: string;
}

export type MessageBlock = TextBlock | CodeBlock | FileBlock;

export interface Message {
  id: string;
  chatId?: string;
  role: MessageRole;
  content: string;
  blocks: MessageBlock[];
  status: MessageStatus;
  createdAt: Date;
  model?: string;
  tokenCount?: number;
  pinned?: boolean;
  /** Parent message in the branch tree (undefined = root of chat) */
  parentId?: string;
  /** Web Search Sources */
  sources?: Source[];
  /** Detailed tool executions (e.g. search, python) */
  toolExecutions?: ToolExecution[];
  /** Vision Support: Base64 encoded images or URLs */
  images?: string[];
}

// ─── Ollama Streaming Types ───────────────────────────────────────────────────

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // Array of base64 strings
}

export interface StreamChunk {
  model: string;
  created_at: string;
  message: { role: 'assistant'; content: string };
  done: boolean;
  done_reason?: 'stop' | 'length' | 'load';
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
  };
}

// ─── Model Types ──────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextLimit: number;
  parameters?: string;
  family?: string;
  quantization?: string;
  size?: string;
  tags?: string[];
  isLocal?: boolean;
}

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  contextLimit: number;
  topP: number;
  topK: number;
  systemPrompt: string;
  systemPromptPreset: string;
}

// ─── Chat Types ──────────────────────────────────────────────────────────────

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
  totalTokens?: number;
  systemPrompt?: string;
  systemPromptPreset?: string;
  contextLimit?: number;
  /**
   * Tracks which sibling is active at each branch point.
   * Key: parentId of the sibling group (or '$root' for top-level messages).
   * Value: 0-based index into the sorted sibling array.
   */
  branchCursors: Record<string, number>;
}

export type ChatGroup = {
  label: string;
  chats: Chat[];
};

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';
export type RightPanelTab = 'sources' | 'tools' | 'memory' | 'timeline';

export interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;
  commandBarOpen: boolean;
  theme: Theme;
  density: Density;
  autoScroll: boolean;
  showLineNumbers: boolean;
  animationsEnabled: boolean;
  /** Canvas preview panel */
  canvasOpen: boolean;
  canvasCode: string;
  canvasLanguage: string;
  /** Keyboard shortcuts modal */
  shortcutsOpen: boolean;
}

// ─── Source / Memory Types ────────────────────────────────────────────────────

export interface Source {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface ToolExecution {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  input?: string;
  output?: string;
  duration?: number;
}

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: Date;
}

// ─── Ollama Connection Types ──────────────────────────────────────────────────

export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'disconnected';

export interface OllamaLocalModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface PullProgressChunk {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export interface PullState {
  status: 'pulling' | 'verifying' | 'success' | 'error';
  message: string;
  total: number;
  completed: number;
  percent: number;
  error?: string;
}

// ─── Compare Types ───────────────────────────────────────────────────────────

export interface CompareResponse {
  modelId: string;
  content: string;
  status: 'thinking' | 'streaming' | 'completed' | 'error';
  tokenCount: number;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface CompareSession {
  id: string;
  prompt: string;
  responses: Record<string, CompareResponse>;
  createdAt: Date;
}

// ─── Debug Types ──────────────────────────────────────────────────────────────

export interface DebugEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: unknown;
}