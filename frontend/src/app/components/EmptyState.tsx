import { useCallback } from 'react';
import { Bot, Zap, Code2, Search, FileText, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';
import { useNavigate } from 'react-router';

const SUGGESTIONS = [
  {
    icon: <Code2 className="w-4 h-4" />,
    label: 'Write a custom React hook for data fetching with TypeScript',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    label: 'Explain the difference between SQL and NoSQL databases',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    icon: <Search className="w-4 h-4" />,
    label: 'Implement binary search in Python with detailed comments',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: <FileText className="w-4 h-4" />,
    label: 'What are var, let, and const differences in JavaScript?',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
];

interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const navigate = useNavigate();
  const { createChat } = useChatStore();
  const { activeModelId } = useModelStore();

  const handleNewChat = useCallback(async () => {
    const id = await createChat(activeModelId);
    navigate(`/chat/${id}`);
  }, [createChat, navigate, activeModelId]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-md w-full text-center"
      >
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/25">
          <Bot className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-foreground mb-2">How can I help you?</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          I'm your local AI assistant powered by Ollama. Ask me anything — I'm here to help you think, code, write, and explore.
        </p>

        {/* Suggestions */}
        <div className="w-full space-y-2 mb-8">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
              onClick={() => onSuggestionClick?.(s.label)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all group text-left"
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.bg} ${s.color} shrink-0`}>
                {s.icon}
              </span>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                {s.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* New chat CTA */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleNewChat}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 text-sm"
        >
          <Plus className="w-4 h-4" />
          Start New Chat
        </motion.button>

        {/* Local indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-2 mt-6 text-xs text-muted-foreground/50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Running locally · Private · No internet required
        </motion.div>
      </motion.div>
    </div>
  );
}
