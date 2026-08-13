import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw, ChevronDown, Sparkles, Minimize2,
  Maximize2, Brain, Cpu, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';

// ─── Transform Options ────────────────────────────────────────────────────────

const TRANSFORMS = [
  {
    id: 'improve',
    label: 'Improve',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    instruction: 'Please rewrite your previous response to be clearer, more accurate, and better structured. Keep the same level of detail but improve quality.',
  },
  {
    id: 'shorter',
    label: 'Make shorter',
    icon: <Minimize2 className="w-3.5 h-3.5" />,
    instruction: 'Please rewrite your previous response to be significantly more concise. Keep only the most important information and remove any fluff or repetition.',
  },
  {
    id: 'longer',
    label: 'Make longer',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    instruction: 'Please expand your previous response with more detail, examples, and thorough explanations. Be comprehensive.',
  },
  {
    id: 'eli5',
    label: 'Explain simply',
    icon: <Brain className="w-3.5 h-3.5" />,
    instruction: 'Please rewrite your previous response as a simple explanation that anyone could understand, using clear language, basic analogies, and no jargon.',
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface RegenerateMenuProps {
  chatId: string;
  messageId: string;
  disabled?: boolean;
  settings?: { systemPrompt?: string; temperature?: number; maxTokens?: number };
}

export function RegenerateMenu({ chatId, messageId, disabled, settings }: RegenerateMenuProps) {
  const [open, setOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { regenerateAssistant, transformMessage } = useChatStore();
  const { models, activeModelId } = useModelStore();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRegenerate = (modelId?: string) => {
    setOpen(false);
    regenerateAssistant(chatId, messageId, modelId ?? activeModelId, settings);
  };

  const handleTransform = (instruction: string) => {
    setOpen(false);
    transformMessage(chatId, messageId, instruction, activeModelId, settings);
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      {/* Primary regenerate button */}
      <button
        onClick={() => handleRegenerate()}
        disabled={disabled}
        title="Regenerate"
        className="flex items-center gap-1.5 px-2 py-1 rounded-l-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs disabled:opacity-40 border-r border-border/30"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Regenerate
      </button>

      {/* Dropdown trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center px-1.5 py-1 rounded-r-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs disabled:opacity-40"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full mb-2 left-0 z-50 bg-popover border border-border rounded-xl shadow-2xl p-1.5 min-w-[200px]"
          >
            {/* Same model */}
            <button
              onClick={() => handleRegenerate()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-left text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              Regenerate
            </button>

            {/* Different model submenu */}
            <div className="relative">
              <button
                onClick={() => setModelMenuOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-left text-foreground"
              >
                <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">Use different model</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {modelMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.08 }}
                    className="ml-2 mb-1 overflow-hidden"
                  >
                    {models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => { handleRegenerate(model.id); setModelMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors text-xs text-left text-foreground"
                      >
                        {model.id === activeModelId
                          ? <Check className="w-3 h-3 text-primary shrink-0" />
                          : <div className="w-3 h-3 shrink-0" />}
                        {model.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="my-1 h-px bg-border/50" />

            {/* Transform options */}
            {TRANSFORMS.map(t => (
              <button
                key={t.id}
                onClick={() => handleTransform(t.instruction)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-left text-foreground"
              >
                <span className="text-primary/60 shrink-0">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
