import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Play, Square, RotateCcw, Zap, Clock,
  CheckCircle2, AlertCircle, Loader2, GitCompare,
  ChevronDown, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCompareStore } from '../../store/compare.store';
import { useModelStore } from '../../store/model.store';
import { useConnectionStore } from '../../store/connection.store';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import type { CompareResponse } from '../../types';

// ─── Model Picker ─────────────────────────────────────────────────────────────

const FAMILY_COLORS: Record<string, string> = {
  llama: 'text-blue-400', Llama: 'text-blue-400',
  mistral: 'text-orange-400', Mistral: 'text-orange-400',
  phi: 'text-emerald-400', Phi: 'text-emerald-400',
  qwen: 'text-purple-400', Qwen: 'text-purple-400',
  gemma: 'text-pink-400',  Gemma: 'text-pink-400',
};

function ModelPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (models: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { models } = useModelStore();
  const { installedModels, status } = useConnectionStore();

  // Show installed models when connected, else catalog
  const displayModels = status === 'connected' && installedModels.length > 0
    ? installedModels.map(m => ({
        id: m.name,
        label: m.name,
        family: m.details?.family,
        installed: true,
      }))
    : models.map(m => ({ id: m.id, label: m.name, family: m.family, installed: false }));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < 4) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border/50 hover:border-border transition-all text-sm"
      >
        <span className="text-foreground">
          {selected.length === 0
            ? 'Select models…'
            : `${selected.length} model${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 left-0 z-50 min-w-[240px] bg-popover border border-border rounded-xl shadow-2xl p-1.5 max-h-64 overflow-y-auto"
          >
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider px-2 py-1">
              Select up to 4 models
            </p>
            {displayModels.map(model => {
              const isSelected = selected.includes(model.id);
              const disabled = !isSelected && selected.length >= 4;
              const color = FAMILY_COLORS[model.family ?? ''] ?? 'text-muted-foreground';
              return (
                <button
                  key={model.id}
                  onClick={() => toggle(model.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                    isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className="flex-1 truncate">{model.label}</span>
                  {model.installed && <span className="text-[10px] text-green-400 shrink-0">✓</span>}
                  <span className={`text-[10px] shrink-0 ${color}`}>{model.family ?? ''}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ─── Response Column ──────────────────────────────────────────────────────────

function ResponseColumn({ response, modelIndex }: { response: CompareResponse; modelIndex: number }) {
  const hues = ['violet', 'blue', 'emerald', 'orange'];
  const colorClass = [
    'border-violet-400/20 bg-violet-400/5',
    'border-blue-400/20 bg-blue-400/5',
    'border-emerald-400/20 bg-emerald-400/5',
    'border-orange-400/20 bg-orange-400/5',
  ][modelIndex % 4];

  const headerColor = [
    'text-violet-400', 'text-blue-400', 'text-emerald-400', 'text-orange-400',
  ][modelIndex % 4];

  return (
    <div className={`flex flex-col rounded-2xl border ${colorClass} overflow-hidden min-w-0`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/40">
        <span className={`text-xs truncate ${headerColor}`}>{response.modelId}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {response.status === 'thinking' && (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1 h-1 rounded-full bg-primary/60"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          )}
          {response.status === 'streaming' && (
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          )}
          {response.status === 'completed' && (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          )}
          {response.status === 'error' && (
            <AlertCircle className="w-3 h-3 text-destructive" />
          )}
          {response.tokenCount > 0 && (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{response.tokenCount}
            </span>
          )}
          {response.durationMs !== undefined && (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{(response.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-48 max-h-[60vh]">
        {response.status === 'error' ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Generation failed. Try again.</span>
          </div>
        ) : response.content ? (
          <div className="text-sm text-foreground leading-relaxed">
            <MarkdownRenderer content={response.content} />
            {response.status === 'streaming' && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-primary ml-0.5 rounded-full align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session History ──────────────────────────────────────────────────────────

function SessionHistory() {
  const { sessions, activeSessionId } = useCompareStore();
  if (sessions.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {sessions.map((sess, i) => (
        <button
          key={sess.id}
          onClick={() => useCompareStore.getState().sessions.length > 0 &&
            useCompareStore.setState({ activeSessionId: sess.id })}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs border transition-all ${
            sess.id === activeSessionId
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          #{sessions.length - i}: {sess.prompt.slice(0, 30)}{sess.prompt.length > 30 ? '…' : ''}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ComparePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [localModels, setLocalModels] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { sessions, activeSessionId, isComparing, runComparison, stopComparison, clearSession } = useCompareStore();
  const { settings } = useModelStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);

  const canRun = prompt.trim().length > 0 && localModels.length >= 2 && !isComparing;

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    const p = prompt.trim();
    await runComparison(p, localModels, {
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    });
  }, [canRun, prompt, localModels, runComparison, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const gridCols = activeSession
    ? {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
      }[Object.keys(activeSession.responses).length] ?? 'grid-cols-1 md:grid-cols-2'
    : '';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          <div>
            <h2>Model Compare</h2>
            <p className="text-xs text-muted-foreground">Run the same prompt across multiple models simultaneously</p>
          </div>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => useCompareStore.getState().clearAll()}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Clear history
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">

        {/* Prompt input card */}
        <div className="p-5 rounded-2xl border border-border/50 bg-card">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <ModelPicker selected={localModels} onChange={setLocalModels} />

            <div className="flex items-center gap-2 ml-auto">
              {isComparing ? (
                <button
                  onClick={stopComparison}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all text-sm"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  disabled={!canRun}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  Compare
                </button>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Enter a prompt to compare across models… (⌘+Enter to run)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none transition-colors"
            style={{ overflow: 'hidden' }}
          />

          <div className="flex items-center gap-3 mt-2.5">
            {localModels.length < 2 && (
              <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Select at least 2 models to compare
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/40 ml-auto">⌘+Enter to run</p>
          </div>
        </div>

        {/* Session history tabs */}
        <SessionHistory />

        {/* Active session results */}
        {activeSession && (
          <div className={`grid ${gridCols} gap-4`}>
            {Object.values(activeSession.responses).map((response, i) => (
              <motion.div
                key={response.modelId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.08 }}
              >
                <ResponseColumn response={response} modelIndex={i} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <GitCompare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-foreground mb-2">Compare models side by side</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select 2–4 models above, type a prompt, and see how each model responds simultaneously.
              Great for benchmarking reasoning, coding ability, and response style.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-8 max-w-sm w-full text-left">
              {[
                { label: 'Speed', desc: 'Compare tokens/sec' },
                { label: 'Quality', desc: 'Side-by-side output' },
                { label: 'Style', desc: 'Different perspectives' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-muted/50 border border-border/30">
                  <p className="text-xs text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
