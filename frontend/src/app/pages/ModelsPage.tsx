import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Check, ChevronRight, Download, Cpu,
  Zap, MemoryStick, Tag, RefreshCw, Wifi, WifiOff,
  Loader2, X, AlertCircle, CheckCircle2, Package,
  HardDrive, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useModelStore } from '../../store/model.store';
import { useConnectionStore } from '../../store/connection.store';
import type { ModelInfo, OllamaLocalModel } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const FAMILY_COLORS: Record<string, { bg: string; text: string }> = {
  llama:   { bg: 'bg-blue-400/10',    text: 'text-blue-400' },
  Llama:   { bg: 'bg-blue-400/10',    text: 'text-blue-400' },
  mistral: { bg: 'bg-orange-400/10',  text: 'text-orange-400' },
  Mistral: { bg: 'bg-orange-400/10',  text: 'text-orange-400' },
  phi:     { bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
  Phi:     { bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
  qwen:    { bg: 'bg-purple-400/10',  text: 'text-purple-400' },
  Qwen:    { bg: 'bg-purple-400/10',  text: 'text-purple-400' },
  gemma:   { bg: 'bg-pink-400/10',    text: 'text-pink-400' },
  Gemma:   { bg: 'bg-pink-400/10',    text: 'text-pink-400' },
};

function familyStyle(family?: string) {
  if (!family) return { bg: 'bg-muted', text: 'text-muted-foreground' };
  return FAMILY_COLORS[family] ?? { bg: 'bg-muted', text: 'text-muted-foreground' };
}

// ─── Connection Status Banner ─────────────────────────────────────────────────

function ConnectionBanner() {
  const { status, version, baseUrl, lastChecked, checkConnection, useRealMode, setUseRealMode } =
    useConnectionStore();

  const statusConfig = {
    idle:         { icon: <Wifi className="w-4 h-4" />,          color: 'text-muted-foreground', bg: 'bg-muted/30 border-border/50',        label: 'Not checked' },
    checking:     { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Connecting…' },
    connected:    { icon: <CheckCircle2 className="w-4 h-4" />,  color: 'text-green-400',         bg: 'bg-green-400/10 border-green-400/20',  label: `Connected — v${version ?? '?'}` },
    disconnected: { icon: <WifiOff className="w-4 h-4" />,       color: 'text-destructive',       bg: 'bg-destructive/10 border-destructive/20', label: 'Ollama offline — using mock mode' },
  };

  const cfg = statusConfig[status];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${cfg.bg}`}>
      <span className={cfg.color}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground/50 hidden sm:block">·</span>
          <span className="text-xs text-muted-foreground/50 hidden sm:block truncate">{baseUrl}</span>
        </div>
        {lastChecked && (
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
            Last checked {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status === 'connected' && (
          <button
            onClick={() => setUseRealMode(!useRealMode)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
              useRealMode
                ? 'bg-green-400/15 text-green-400 border-green-400/25'
                : 'bg-muted text-muted-foreground border-border/50 hover:text-foreground'
            }`}
            title={useRealMode ? 'Using real Ollama — click to switch to mock' : 'Using mock — click to use real Ollama'}
          >
            {useRealMode ? 'Real mode' : 'Mock mode'}
          </button>
        )}
        <button
          onClick={checkConnection}
          disabled={status === 'checking'}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-50"
          title="Re-check connection"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Pull Progress Bar ────────────────────────────────────────────────────────

function PullProgressCard({ name }: { name: string }) {
  const { pulls, dismissPull, cancelPull } = useConnectionStore();
  const pull = pulls[name];
  if (!pull) return null;

  const isDone = pull.status === 'success' || pull.status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`mt-3 p-3 rounded-xl border ${
        pull.status === 'error'
          ? 'bg-destructive/10 border-destructive/20'
          : pull.status === 'success'
          ? 'bg-green-400/10 border-green-400/20'
          : 'bg-muted/50 border-border/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-foreground truncate">
          {pull.status === 'success' ? '✓ Installed' : pull.status === 'error' ? '✗ Failed' : pull.message}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <button
              onClick={() => cancelPull(name)}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {isDone && (
            <button
              onClick={() => dismissPull(name)}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {pull.status === 'error' && (
        <p className="text-xs text-destructive">{pull.error}</p>
      )}

      {pull.status !== 'error' && pull.total > 0 && (
        <>
          <div className="w-full h-1 rounded-full bg-border/50 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${pull.status === 'success' ? 'bg-green-400' : 'bg-primary'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pull.percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{formatBytes(pull.completed)} / {formatBytes(pull.total)}</span>
            <span className="text-[10px] text-muted-foreground">{pull.percent}%</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── Installed Model Card ─────────────────────────────────────────────────────

function InstalledModelCard({
  model,
  isActive,
  onSelect,
}: {
  model: OllamaLocalModel;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const family = model.details?.family ?? '';
  const fs = familyStyle(family);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
        isActive
          ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
      }`}
      onClick={() => onSelect(model.name)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${fs.bg} flex items-center justify-center shrink-0`}>
            <Cpu className={`w-4 h-4 ${fs.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-foreground">{model.name}</span>
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  <Check className="w-2.5 h-2.5" /> Active
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-400/15 text-green-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> Installed
              </span>
            </div>
            {family && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${fs.bg} ${fs.text} mt-0.5 inline-block`}>
                {family}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground'}`} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <HardDrive className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground">{formatBytes(model.size)}</span>
          <span className="text-[9px] text-muted-foreground/50">Size</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Tag className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground truncate w-full text-center">
            {model.details?.quantization_level ?? '—'}
          </span>
          <span className="text-[9px] text-muted-foreground/50">Quant</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Clock className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground">{formatDate(model.modified_at)}</span>
          <span className="text-[9px] text-muted-foreground/50">Updated</span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between">
        <button
          onClick={e => { e.stopPropagation(); onSelect(model.name); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            isActive
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          {isActive ? <><Check className="w-3 h-3" /> Currently active</> : <><Zap className="w-3 h-3" /> Use this model</>}
        </button>
        <span className="text-[10px] text-muted-foreground/40">
          {model.details?.parameter_size ?? ''}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Catalog Model Card (for offline/pull view) ───────────────────────────────

function CatalogModelCard({
  model,
  isActive,
  isInstalled,
  onSelect,
  onPull,
  pulling,
}: {
  model: ModelInfo;
  isActive: boolean;
  isInstalled: boolean;
  onSelect: (id: string) => void;
  onPull: (id: string) => void;
  pulling: boolean;
}) {
  const fs = familyStyle(model.family);
  const { pulls } = useConnectionStore();
  const pullState = pulls[model.id];

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={`p-4 rounded-2xl border transition-all group ${
        isActive
          ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
      } ${isInstalled ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isInstalled && onSelect(model.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${fs.bg} flex items-center justify-center shrink-0`}>
            <Cpu className={`w-4 h-4 ${fs.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-foreground text-sm">{model.name}</h4>
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  <Check className="w-2.5 h-2.5" /> Active
                </span>
              )}
              {isInstalled && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-400/15 text-green-400">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Installed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {model.family && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${fs.bg} ${fs.text}`}>{model.family}</span>
              )}
              <span className="text-[10px] text-muted-foreground/50">{model.parameters}</span>
            </div>
          </div>
        </div>
        {isInstalled && <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/30'}`} />}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{model.description}</p>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <MemoryStick className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground">{model.size}</span>
          <span className="text-[9px] text-muted-foreground/50">Size</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Zap className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground">
            {model.contextLimit >= 1000
              ? `${(model.contextLimit / 1000).toFixed(0)}K`
              : model.contextLimit}
          </span>
          <span className="text-[9px] text-muted-foreground/50">Context</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Tag className="w-3 h-3 text-muted-foreground mb-1" />
          <span className="text-[10px] text-foreground">{model.quantization}</span>
          <span className="text-[9px] text-muted-foreground/50">Quant</span>
        </div>
      </div>

      {model.tags && model.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {model.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between">
        {isInstalled ? (
          <button
            onClick={e => { e.stopPropagation(); onSelect(model.id); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {isActive ? <><Check className="w-3 h-3" /> Currently active</> : <><Zap className="w-3 h-3" /> Use this model</>}
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onPull(model.id); }}
            disabled={pulling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {pulling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {pulling ? 'Pulling…' : 'Pull model'}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground/40">ollama pull {model.id}</span>
      </div>

      {/* Pull progress */}
      <AnimatePresence>
        {pullState && <PullProgressCard name={model.id} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Pull Custom Model ────────────────────────────────────────────────────────

function PullCustomModel() {
  const [value, setValue] = useState('');
  const { pullModel, pulls, status } = useConnectionStore();
  const pullState = pulls[value.trim()];
  const pulling = pullState?.status === 'pulling' || pullState?.status === 'verifying';

  const handlePull = useCallback(() => {
    const name = value.trim();
    if (!name || status !== 'connected') return;
    pullModel(name);
  }, [value, pullModel, status]);

  return (
    <div className="mt-6 p-5 rounded-2xl border border-dashed border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h4 className="text-foreground text-sm">Pull Any Model</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter any model name from{' '}
            <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline">ollama.com/library</a>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePull()}
          placeholder="e.g. llama3.2:3b, phi4:latest, gemma3:4b"
          disabled={status !== 'connected'}
          className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handlePull}
          disabled={!value.trim() || status !== 'connected' || pulling}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Pull
        </button>
      </div>
      {status !== 'connected' && (
        <p className="text-xs text-muted-foreground/50 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Ollama must be running to pull models
        </p>
      )}
      <AnimatePresence>
        {value.trim() && pulls[value.trim()] && (
          <PullProgressCard name={value.trim()} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ModelsPage() {
  const navigate = useNavigate();
  const { models, activeModelId, setActiveModel } = useModelStore();
  const { status, installedModels, pulls, checkConnection, refreshModels } = useConnectionStore();

  const isConnected = status === 'connected';

  // Build a set of installed model names for quick lookup
  const installedNames = new Set(installedModels.map(m => m.name));

  // Catalog models enriched with installed status
  const catalogWithStatus = models.map(m => ({
    ...m,
    isInstalled: installedNames.has(m.id),
  }));

  // Installed models not in catalog (e.g. custom pulls)
  const extraInstalled = installedModels.filter(m => !models.some(c => c.id === m.name));

  const handleSelectModel = useCallback((id: string) => {
    setActiveModel(id);
  }, [setActiveModel]);

  const handlePull = useCallback((id: string) => {
    useConnectionStore.getState().pullModel(id);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2>Models</h2>
          <p className="text-xs text-muted-foreground">
            {isConnected
              ? `${installedModels.length} installed · ${models.length} in catalog`
              : `${models.length} models in catalog`}
          </p>
        </div>
        <button
          onClick={isConnected ? refreshModels : checkConnection}
          className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          title={isConnected ? 'Refresh model list' : 'Check connection'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-6">
        {/* Connection status */}
        <ConnectionBanner />

        {/* Installed models (real Ollama) */}
        {isConnected && installedModels.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <h3 className="text-foreground text-sm">Installed Models</h3>
              <span className="px-2 py-0.5 rounded-full bg-green-400/15 text-green-400 text-[10px]">
                {installedModels.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {installedModels.map((model, i) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <InstalledModelCard
                    model={model}
                    isActive={model.name === activeModelId}
                    onSelect={handleSelectModel}
                  />
                </motion.div>
              ))}
              {/* Extra installed models not in catalog */}
              {extraInstalled.map((model, i) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: (installedModels.length + i) * 0.05 }}
                >
                  <InstalledModelCard
                    model={model}
                    isActive={model.name === activeModelId}
                    onSelect={handleSelectModel}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Catalog — always shown */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-foreground text-sm">
              {isConnected ? 'Available to Pull' : 'Model Catalog'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
              {catalogWithStatus.length}
            </span>
          </div>

          {!isConnected && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-400/10 border border-amber-400/20 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">
                Ollama is not running. These are reference models — start Ollama to pull and use them.{' '}
                <span className="font-mono text-amber-400">ollama serve</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogWithStatus.map((model, i) => {
              const pullState = pulls[model.id];
              const pulling = pullState?.status === 'pulling' || pullState?.status === 'verifying';
              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                >
                  <CatalogModelCard
                    model={model}
                    isActive={model.id === activeModelId}
                    isInstalled={model.isInstalled}
                    onSelect={handleSelectModel}
                    onPull={handlePull}
                    pulling={pulling}
                  />
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Pull custom model */}
        <PullCustomModel />
      </div>
    </div>
  );
}
