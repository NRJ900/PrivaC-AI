import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Copy, Check, ThumbsUp, ThumbsDown,
  Pin, PinOff, AlertCircle, Zap,
  ChevronLeft, ChevronRight, GitBranch, Pencil, X, CornerDownRight, RefreshCw, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Message } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';
import { RegenerateMenu } from './RegenerateMenu';

interface MessageBubbleProps {
  message: Message;
  chatId: string;
  branchPosition?: { index: number; total: number };
  onNavigateBranch?: (delta: 1 | -1) => void;
  onFork?: (newContent: string) => void;
  onRegenerate?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-primary ml-0.5 rounded-full align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function ThinkingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-1">{text || 'Thinking…'}</span>
      </div>
    </div>
  );
}

function AIAvatar({ modelName }: { modelName?: string }) {
  const initial = modelName?.charAt(0)?.toUpperCase() ?? 'A';
  return (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-violet-500/20">
      {initial}
    </div>
  );
}

function ModelBadge({ model }: { model: string }) {
  return <span className="text-[10px] text-muted-foreground/60 font-mono">{model.split(':')[0]}</span>;
}

// ─── Branch Navigator ─────────────────────────────────────────────────────────

function BranchNav({
  position,
  onNavigate,
}: {
  position: { index: number; total: number };
  onNavigate: (delta: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-muted/70 border border-border/50 shrink-0">
      <button
        onClick={() => onNavigate(-1)}
        disabled={position.index === 0}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <span className="text-[10px] text-muted-foreground/70 select-none px-0.5 tabular-nums">
        {position.index + 1}/{position.total}
      </span>
      <button
        onClick={() => onNavigate(1)}
        disabled={position.index === position.total - 1}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Inline Edit Input ────────────────────────────────────────────────────────

function EditInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
      // Auto-size
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') onCancel();
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) { onCancel(); return; }
    onSubmit(trimmed);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        className="w-full px-4 py-3 rounded-2xl rounded-br-sm bg-primary/15 border-2 border-primary/40 text-foreground text-sm leading-relaxed focus:outline-none focus:border-primary/70 resize-none transition-colors"
        style={{ overflow: 'hidden' }}
      />
      <div className="flex items-center gap-2 mt-2 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || value.trim() === initial}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CornerDownRight className="w-3 h-3" /> Send fork
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  chatId,
  branchPosition,
  onNavigateBranch,
  onFork,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { pinMessage, isStreaming, regenerateAssistant, chats } = useChatStore();
  const { settings } = useModelStore();
  
  const chat = chats.find(c => c.id === chatId);
  // Aggregate all sources from the chat history so citations in follow-ups work
  const allSources = chat?.messages.flatMap(m => m.sources ?? []) ?? [];
  // Deduplicate by URL to keep indices consistent
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());

  const isUser = message.role === 'user';
  const isThinking = message.status === 'thinking';
  const isStreamingMsg = message.status === 'streaming';
  const isError = message.status === 'error';
  const isCompleted = message.status === 'completed';
  const hasBranch = !!branchPosition;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  const handlePin = useCallback(() => {
    pinMessage(chatId, message.id, !message.pinned);
  }, [chatId, message.id, message.pinned, pinMessage]);

  const handleForkSubmit = useCallback((newContent: string) => {
    setIsEditing(false);
    onFork?.(newContent);
  }, [onFork]);

  const timeStr = message.createdAt instanceof Date
    ? message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── User Message ───────────────────────────���──────────────────────────────

  if (isUser) {
    const attachmentNames = Array.from(message.content.matchAll(/\[ATTACHMENT:\s*([^\]]+)\]/g)).map(m => m[1]);
    const cleanUserText = attachmentNames.length > 0
      ? message.content.replace(/^(\[ATTACHMENT:\s*[^\]]+\][\s\S]*?\[END ATTACHMENT\]\s*)+/, '').trim()
      : message.content;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex justify-end mb-4 group"
      >
        <div className="max-w-[78%] lg:max-w-[65%]">
          {/* Branch nav above the bubble */}
          {hasBranch && branchPosition && onNavigateBranch && (
            <div className="flex items-center justify-end gap-2 mb-1.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <GitBranch className="w-2.5 h-2.5" />
                <span>Branch</span>
              </div>
              <BranchNav position={branchPosition} onNavigate={onNavigateBranch} />
            </div>
          )}

          {isEditing ? (
            <EditInput
              initial={cleanUserText}
              onSubmit={handleForkSubmit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="relative px-4 py-3 rounded-2xl rounded-br-sm bg-primary text-primary-foreground shadow-sm">
              {attachmentNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attachmentNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-xs font-medium border border-white/10">
                      <FileText className="w-3.5 h-3.5 opacity-80" />
                      <span className="truncate max-w-[200px]">{name}</span>
                    </div>
                  ))}
                </div>
              )}
              {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.images.map((img, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/20 shadow-lg cursor-zoom-in"
                    >
                      <img 
                        src={`data:image/png;base64,${img}`} 
                        alt="Attached" 
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
              <p className="leading-relaxed whitespace-pre-wrap break-words text-sm">
                {cleanUserText}
              </p>
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center justify-end gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-muted-foreground/50">{timeStr}</span>
              <button onClick={handleCopy} className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors" title="Copy">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              {onFork && !isStreaming && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-primary transition-colors"
                  title="Edit & fork"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Assistant Message ─────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-start gap-3 mb-6 group"
    >
      <AIAvatar modelName={message.model} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-foreground/70">Assistant</span>
          {message.model && <ModelBadge model={message.model} />}
          {message.pinned && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500/70">
              <Pin className="w-2.5 h-2.5" /> pinned
            </span>
          )}
          {hasBranch && branchPosition && onNavigateBranch && (
            <>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 ml-auto">
                <GitBranch className="w-2.5 h-2.5" />
              </div>
              <BranchNav position={branchPosition} onNavigate={onNavigateBranch} />
            </>
          )}
        </div>

        {/* Content */}
        <div className="relative">
          {isThinking && <ThinkingIndicator text={message.content || undefined} />}

          {isError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Something went wrong. Please try again.</span>
              <button
                onClick={() => regenerateAssistant(chatId, message.id, message.model ?? 'llama3.2:3b', { systemPrompt: settings.systemPrompt })}
                disabled={isStreaming}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-xs transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {(isStreamingMsg || isCompleted) && message.content && (
            <div className="text-sm text-foreground leading-relaxed">
              <MarkdownRenderer content={message.content} sources={uniqueSources} />
              {isStreamingMsg && <TypingCursor />}
            </div>
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap"
            >
              <button onClick={handleCopy} title="Copy" className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              {/* Smart regenerate menu replaces plain Regenerate button */}
              <RegenerateMenu
                chatId={chatId}
                messageId={message.id}
                disabled={isStreaming}
                settings={{
                  systemPrompt: settings.systemPrompt,
                  temperature: settings.temperature,
                  maxTokens: settings.maxTokens,
                }}
              />

              <div className="w-px h-4 bg-border mx-1" />

              <button onClick={() => setLiked(true)} title="Good response" className={`p-1.5 rounded-lg transition-all ${liked === true ? 'text-green-400 bg-green-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setLiked(false)} title="Bad response" className={`p-1.5 rounded-lg transition-all ${liked === false ? 'text-red-400 bg-red-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={handlePin} title={message.pinned ? 'Unpin' : 'Pin'} className={`p-1.5 rounded-lg transition-all ${message.pinned ? 'text-amber-400 bg-amber-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                {message.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>

              <div className="ml-auto flex items-center gap-1.5">
                {message.tokenCount && message.tokenCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <Zap className="w-2.5 h-2.5" />
                    {message.tokenCount.toLocaleString()} tokens
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/40">{timeStr}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}