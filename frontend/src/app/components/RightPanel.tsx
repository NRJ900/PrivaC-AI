import { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle2, Clock, XCircle, Brain, Trash2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../../store/ui.store';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';
import { AgentTimeline } from './AgentTimeline';
import type { Source, ToolExecution, MemoryItem } from '../../types';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_SOURCES: Source[] = [
  {
    id: '1',
    title: 'Binary Search Algorithm — Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Binary_search_algorithm',
    domain: 'en.wikipedia.org',
    snippet: 'In computer science, binary search, also known as half-interval search or logarithmic search, is a search algorithm that finds the position of a target value within a sorted array.',
  },
  {
    id: '2',
    title: 'Python bisect — Standard Library',
    url: 'https://docs.python.org/3/library/bisect.html',
    domain: 'docs.python.org',
    snippet: 'This module provides support for maintaining a list in sorted order without having to sort the list after each insertion.',
  },
  {
    id: '3',
    title: 'Time Complexity of Binary Search',
    url: 'https://www.geeksforgeeks.org/binary-search/',
    domain: 'geeksforgeeks.org',
    snippet: 'Binary Search is a searching algorithm used in a sorted array by repeatedly dividing the search interval in half.',
  },
];

const MOCK_TOOLS: ToolExecution[] = [
  {
    id: '1',
    name: 'Code execution',
    status: 'completed',
    input: 'binary_search([1,3,5,7,9], 5)',
    output: '2',
    duration: 45,
  },
  {
    id: '2',
    name: 'Web search',
    status: 'completed',
    input: 'binary search python implementation',
    duration: 312,
  },
];

const MOCK_MEMORY: MemoryItem[] = [
  {
    id: '1',
    content: 'User prefers TypeScript over JavaScript for code examples',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: '2',
    content: 'User is working on a backend API project',
    createdAt: new Date(Date.now() - 172800000),
  },
  {
    id: '3',
    content: 'User prefers concise explanations with examples',
    createdAt: new Date(Date.now() - 259200000),
  },
];

// ─── Tab Content ──────────────────────────────────────────────────────────────

function SourcesTab() {
  const { chats, activeChatId } = useChatStore();
  const chat = chats.find(c => c.id === activeChatId);
  
  // Aggregate all sources from all messages
  const allSources = chat?.messages.flatMap(m => m.sources ?? []) ?? [];
  // Remove duplicates by URL
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());

  if (uniqueSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 opacity-40">
        <Activity className="w-8 h-8 mb-2" />
        <p className="text-xs">No sources for this chat</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {uniqueSources.map(source => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all group"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-xs text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {source.title}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {source.snippet}
          </p>
          <span className="text-[10px] text-muted-foreground/50">{source.domain}</span>
        </a>
      ))}
    </div>
  );
}

function ToolsTab() {
  const { chats, activeChatId } = useChatStore();
  const chat = chats.find(c => c.id === activeChatId);
  
  // Aggregate all tool executions
  const allTools = chat?.messages.flatMap(m => m.toolExecutions ?? []) ?? [];

  if (allTools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 opacity-40">
        <Activity className="w-8 h-8 mb-2" />
        <p className="text-xs">No tools used yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {allTools.map(tool => (
        <div
          key={tool.id}
          className="p-3 rounded-xl border border-border/50 bg-card"
        >
          <div className="flex items-center gap-2 mb-2">
            {tool.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
            {tool.status === 'running' && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />}
            {tool.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
            <span className="text-xs text-foreground">{tool.name}</span>
            {tool.duration && (
              <span className="ml-auto text-[10px] text-muted-foreground/50">{tool.duration}ms</span>
            )}
          </div>
          {tool.input && (
            <div className="mt-1.5">
              <p className="text-[10px] text-muted-foreground/50 mb-1">Input</p>
              <code className="block text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
                {tool.input}
              </code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MemoryTab() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    try {
      const apiBase = ((import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/memory`);
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error('[Memory] Fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const apiBase = ((import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      await fetch(`${apiBase}/api/memory/${id}`, { method: 'DELETE' });
      setMemories(m => m.filter(x => x.id !== id));
    } catch (e) {
      console.error('[Memory] Delete failed:', e);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">
          {loading ? 'Loading...' : `${memories.length} stored memories`}
        </span>
      </div>
      
      <div className="space-y-2">
        {memories.map(mem => (
          <div
            key={mem.id}
            className="group flex items-start gap-2 p-3 rounded-xl border border-border/50 hover:border-border transition-all bg-card/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{mem.content}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                {new Date(mem.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(mem.id)}
              className="p-1 rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {!loading && memories.length === 0 && (
        <div className="text-center py-8">
          <Brain className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/50">No memories stored yet</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'sources',  label: 'Sources'  },
  { id: 'tools',    label: 'Tools'    },
  { id: 'memory',   label: 'Memory'   },
  { id: 'timeline', label: 'Timeline' },
] as const;

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, setRightPanelOpen } = useUIStore();

  return (
    <AnimatePresence>
      {rightPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex flex-col h-full border-l border-border/50 bg-card shrink-0 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-0.5 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRightPanelTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    rightPanelTab === tab.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto relative">
            {rightPanelTab === 'sources'  && <SourcesTab />}
            {rightPanelTab === 'tools'    && <ToolsTab />}
            {rightPanelTab === 'memory'   && <MemoryTab />}
            {rightPanelTab === 'timeline' && <AgentTimeline />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}