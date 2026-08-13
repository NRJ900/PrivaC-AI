import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Chat } from '../../types';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '../../store/chat.store';
import { useUIStore } from '../../store/ui.store';
import { useModelStore } from '../../store/model.store';
import {
  computeActivePath,
  getBranchPosition,
  getParentKey,
} from '../../services/branch.service';

interface ChatThreadProps {
  chat: Chat;
}

export function ChatThread({ chat }: ChatThreadProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isStreaming = useChatStore(s => s.isStreaming);
  const { navigateBranch, forkUserMessage, regenerateAssistant } = useChatStore();
  const autoScroll = useUIStore(s => s.autoScroll);
  const { activeModelId, settings } = useModelStore();

  // Derive the active path (visible messages) from the tree
  const activeMessages = useMemo(
    () => computeActivePath(chat.messages, chat.branchCursors ?? {}),
    [chat.messages, chat.branchCursors]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    if (autoScroll && isAtBottom) scrollToBottom('smooth');
  }, [activeMessages, isAtBottom, autoScroll, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('instant');
  }, [chat.id, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 120;
    setIsAtBottom(atBottom);
    setShowScrollBtn(!atBottom && activeMessages.length > 2);
  }, [activeMessages.length]);

  // Branch handlers
  const handleNavigateBranch = useCallback(
    (msgId: string, delta: 1 | -1) => {
      const msg = chat.messages.find(m => m.id === msgId);
      if (!msg) return;
      navigateBranch(chat.id, getParentKey(msg.parentId), delta);
    },
    [chat.id, chat.messages, navigateBranch]
  );

  const handleFork = useCallback(
    async (msgId: string, newContent: string) => {
      await forkUserMessage(chat.id, msgId, newContent, activeModelId, {
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        contextLimit: settings.contextLimit,
        topP: settings.topP,
        topK: settings.topK,
      });
    },
    [chat.id, forkUserMessage, activeModelId, settings]
  );

  const handleRegenerate = useCallback(
    async (msgId: string) => {
      await regenerateAssistant(chat.id, msgId, activeModelId, {
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        contextLimit: settings.contextLimit,
        topP: settings.topP,
        topK: settings.topK,
      });
    },
    [chat.id, regenerateAssistant, activeModelId, settings]
  );

  return (
    <div className="relative flex flex-col h-full">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth px-4 md:px-6 lg:px-8"
      >
        <div className="h-6" />

        <div className="max-w-3xl mx-auto">
          {activeMessages.map((message) => {
            const { index, total } = getBranchPosition(chat.messages, message.id);
            return (
              <MessageBubble
                key={message.id}
                message={message}
                chatId={chat.id}
                branchPosition={total > 1 ? { index, total } : undefined}
                onNavigateBranch={total > 1 ? (delta) => handleNavigateBranch(message.id, delta) : undefined}
                onFork={message.role === 'user' ? (newContent) => handleFork(message.id, newContent) : undefined}
                onRegenerate={message.role === 'assistant' && message.status === 'completed' ? () => handleRegenerate(message.id) : undefined}
              />
            );
          })}
        </div>

        <div ref={bottomRef} className="h-6" />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={() => { setIsAtBottom(true); scrollToBottom(); }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all z-10"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Scroll to bottom
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
