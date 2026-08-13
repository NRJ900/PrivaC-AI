import { useEffect, useState, useMemo } from 'react';
import {
  Hash, Database, Layers, Zap, Code2, CheckCircle2,
  Clock, Loader2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../../store/chat.store';
import { computeActivePath } from '../../services/branch.service';

// ─── Step Definitions ─────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  /** Which message status triggers this step to be "active" */
  activeOn: 'thinking' | 'streaming' | 'completed';
  /** ms delay before auto-completing (mock only) */
  mockDurationMs: number;
}

const STEPS: StepDef[] = [
  { id: 'tokenize',  label: 'Tokenizing prompt',      detail: 'Converting text to token IDs',           icon: <Hash className="w-3.5 h-3.5" />,      activeOn: 'thinking',  mockDurationMs: 200  },
  { id: 'context',   label: 'Loading context window',  detail: 'Filling KV cache with prior messages',  icon: <Database className="w-3.5 h-3.5" />,   activeOn: 'thinking',  mockDurationMs: 450  },
  { id: 'attention', label: 'Computing attention',     detail: 'Multi-head self-attention pass',         icon: <Layers className="w-3.5 h-3.5" />,     activeOn: 'thinking',  mockDurationMs: 700  },
  { id: 'generate',  label: 'Generating tokens',       detail: 'Autoregressive decoding',               icon: <Zap className="w-3.5 h-3.5" />,        activeOn: 'streaming', mockDurationMs: 0    },
  { id: 'decode',    label: 'Detokenizing output',     detail: 'Converting token IDs back to text',     icon: <Code2 className="w-3.5 h-3.5" />,      activeOn: 'completed', mockDurationMs: 0    },
];

type StepStatus = 'pending' | 'running' | 'done';

// ─── Step Row ─────────────────────────────────────────────────────────────────

function StepRow({
  step,
  status,
  elapsed,
  liveTokens,
}: {
  step: StepDef;
  status: StepStatus;
  elapsed?: number;
  liveTokens?: number;
}) {
  const iconColor =
    status === 'done'    ? 'text-green-400' :
    status === 'running' ? 'text-primary'   :
    'text-muted-foreground/30';

  const labelColor =
    status === 'done'    ? 'text-foreground' :
    status === 'running' ? 'text-foreground' :
    'text-muted-foreground/40';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: status === 'pending' ? 0.4 : 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3"
    >
      {/* Icon / spinner */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        status === 'done'    ? 'bg-green-400/10' :
        status === 'running' ? 'bg-primary/10'    :
        'bg-muted/30'
      }`}>
        {status === 'running' ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : status === 'done' ? (
          <CheckCircle2 className={`w-3.5 h-3.5 ${iconColor}`} />
        ) : (
          <span className={iconColor}>{step.icon}</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${labelColor}`}>{step.label}</span>
          {elapsed !== undefined && status === 'done' && (
            <span className="text-[10px] text-muted-foreground/40 ml-auto shrink-0">{elapsed}ms</span>
          )}
          {status === 'running' && liveTokens !== undefined && liveTokens > 0 && (
            <span className="text-[10px] text-primary/60 ml-auto shrink-0 tabular-nums">{liveTokens} tok</span>
          )}
        </div>
        {status !== 'pending' && (
          <p className={`text-[10px] mt-0.5 ${status === 'running' ? 'text-muted-foreground/60' : 'text-muted-foreground/30'}`}>
            {step.detail}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentTimeline() {
  const { chats, activeChatId, isStreaming } = useChatStore();
  const chat = chats.find(c => c.id === activeChatId);

  // Find the current / last assistant message
  const lastAsstMsg = useMemo(() => {
    if (!chat) return null;
    const active = computeActivePath(chat.messages, chat.branchCursors ?? {});
    return [...active].reverse().find(m => m.role === 'assistant') ?? null;
  }, [chat]);

  const msgStatus = lastAsstMsg?.status;
  const liveTokens = lastAsstMsg?.tokenCount ?? 0;

  // Mock timing state
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({});
  const [startTime] = useState(Date.now);

  // Track when each step completed (elapsed ms from component mount)
  useEffect(() => {
    if (!isStreaming && msgStatus !== 'thinking') return;
    setStepTimings({});

    let cancelled = false;
    let cumulative = 0;

    for (const step of STEPS.slice(0, 3)) { // first 3 are "thinking" steps
      const delay = cumulative + step.mockDurationMs;
      cumulative = delay;
      setTimeout(() => {
        if (!cancelled) {
          setStepTimings(prev => ({ ...prev, [step.id]: delay }));
        }
      }, delay);
    }

    return () => { cancelled = true; };
  }, [lastAsstMsg?.id]); // re-run when a new message starts

  // Determine status of each step
  const getStatus = (step: StepDef): StepStatus => {
    if (!msgStatus || msgStatus === 'idle') return 'pending';

    if (msgStatus === 'completed' || msgStatus === 'error') {
      // All steps done
      return 'done';
    }

    if (msgStatus === 'streaming') {
      if (step.activeOn === 'thinking') return 'done';
      if (step.activeOn === 'streaming') return 'running';
      return 'pending';
    }

    if (msgStatus === 'thinking') {
      const idx = STEPS.indexOf(step);
      const prevStep = STEPS[idx - 1];
      if (prevStep && !stepTimings[prevStep.id]) return 'pending';
      if (stepTimings[step.id]) return 'done';
      if (step.activeOn === 'thinking' && !stepTimings[step.id]) {
        // Is it time to start this step?
        const prevDone = idx === 0 || !!stepTimings[STEPS[idx - 1]?.id];
        return prevDone ? 'running' : 'pending';
      }
      return 'pending';
    }

    return 'pending';
  };

  // Stats for completed messages
  const totalMs = lastAsstMsg?.tokenCount
    ? undefined // real timing not tracked yet
    : undefined;

  return (
    <div className="p-4 space-y-1">
      {/* Header status */}
      <div className="flex items-center gap-2 mb-4">
        {isStreaming ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Generating…</span>
          </>
        ) : msgStatus === 'completed' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-muted-foreground">Completed</span>
            {liveTokens > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {liveTokens.toLocaleString()} tokens
              </span>
            )}
          </>
        ) : msgStatus === 'error' ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs text-destructive">Error</span>
          </>
        ) : (
          <>
            <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/40">Waiting for input…</span>
          </>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const status = getStatus(step);
          return (
            <StepRow
              key={step.id}
              step={step}
              status={status}
              elapsed={stepTimings[step.id]}
              liveTokens={step.activeOn === 'streaming' && status === 'running' ? liveTokens : undefined}
            />
          );
        })}
      </div>

      {/* Connector lines */}
      <div className="absolute left-[2.35rem] top-16 bottom-8 w-px bg-border/30 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Empty state */}
      {!lastAsstMsg && (
        <div className="text-center py-8 mt-4">
          <Layers className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/40">No active generation</p>
          <p className="text-[10px] text-muted-foreground/30 mt-1">Send a message to see the execution timeline</p>
        </div>
      )}
    </div>
  );
}
