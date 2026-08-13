import { useEffect, useCallback, useState } from 'react';
import {
  Plus, Settings, Cpu, Moon, Sun, Search, MessageSquare,
  ChevronRight, Hash, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useUIStore } from '../../store/ui.store';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void | Promise<void>;
  group: string;
}

export function CommandBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { commandBarOpen, setCommandBarOpen, toggleTheme, theme } = useUIStore();
  const { createChat, chats } = useChatStore();
  const { models, setActiveModel, activeModelId } = useModelStore();

  const close = useCallback(() => {
    setCommandBarOpen(false);
    setQuery('');
  }, [setCommandBarOpen]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(true);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandBarOpen, close]);

  const commands: Command[] = [
    {
      id: 'new-chat',
      label: 'New Chat',
      description: 'Start a fresh conversation',
      icon: <Plus className="w-4 h-4" />,
      shortcut: 'Ctrl+N',
      group: 'Actions',
      action: async () => {
        const id = await createChat(activeModelId);
        navigate(`/chat/${id}`);
        close();
      },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Model parameters, UI preferences',
      icon: <Settings className="w-4 h-4" />,
      group: 'Navigation',
      action: () => { navigate('/settings'); close(); },
    },
    {
      id: 'models',
      label: 'Manage Models',
      description: 'Browse and configure Ollama models',
      icon: <Cpu className="w-4 h-4" />,
      group: 'Navigation',
      action: () => { navigate('/models'); close(); },
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      group: 'Appearance',
      action: () => { toggleTheme(); close(); },
    },
    ...models.map(model => ({
      id: `model-${model.id}`,
      label: `Use ${model.name}`,
      description: `${model.parameters} · ${model.size}`,
      icon: <Zap className="w-4 h-4" />,
      group: 'Models',
      action: () => { setActiveModel(model.id); close(); },
    })),
    ...chats.slice(0, 5).map(chat => ({
      id: `chat-${chat.id}`,
      label: chat.title,
      description: `${chat.messages.length} messages`,
      icon: <MessageSquare className="w-4 h-4" />,
      group: 'Recent Chats',
      action: () => { navigate(`/chat/${chat.id}`); close(); },
    })),
  ];

  const filtered = query.trim()
    ? commands.filter(
        c =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group filtered commands
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {commandBarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-50 top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search commands, models, chats…"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto p-2">
              {Object.entries(grouped).map(([group, cmds]) => (
                <div key={group}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5">
                    <Hash className="w-2.5 h-2.5 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">{group}</span>
                  </div>
                  {cmds.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group text-left"
                    >
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-accent transition-all">
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{cmd.label}</p>
                        {cmd.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{cmd.description}</p>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                    </button>
                  ))}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">↑↓</kbd>
                Navigate
              </span>
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">↵</kbd>
                Select
              </span>
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">Ctrl+K</kbd>
                Toggle
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
