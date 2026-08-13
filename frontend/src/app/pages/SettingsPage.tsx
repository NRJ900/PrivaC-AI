import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Thermometer, Hash, Brain, Sliders,
  Monitor, Zap, RotateCcw, Check,
  Wifi, WifiOff, Loader2, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { useModelStore } from '../../store/model.store';
import { useUIStore } from '../../store/ui.store';
import { useConnectionStore } from '../../store/connection.store';
import { SYSTEM_PROMPT_PRESETS } from '../../services/model.service';

function SectionHeader({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function SettingSlider({
  label, value, min, max, step, onChange, displayValue, description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  displayValue?: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm text-foreground">{label}</label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-sm text-primary font-mono px-2 py-0.5 rounded bg-primary/10">
          {displayValue ?? value}
        </span>
      </div>
      <Slider.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex items-center select-none touch-none w-full h-5"
      >
        <Slider.Track className="bg-muted relative grow rounded-full h-1.5">
          <Slider.Range className="absolute bg-primary rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md border-2 border-primary hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-transform" />
      </Slider.Root>
    </div>
  );
}

function ToggleSetting({
  label, description, checked, onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <label className="text-sm text-foreground">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-switch-background'
        }`}
      >
        <Switch.Thumb
          className={`block h-3.5 w-3.5 rounded-full bg-white shadow-md transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </Switch.Root>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, setSystemPromptPreset, resetSettings } = useModelStore();
  const { density, setDensity, showLineNumbers, setShowLineNumbers, animationsEnabled, setAnimationsEnabled, autoScroll, setAutoScroll } = useUIStore();
  const { status, baseUrl, version, useRealMode, setBaseUrl, setUseRealMode, checkConnection } = useConnectionStore();

  const [urlInput, setUrlInput] = useState(baseUrl);
  const [urlDirty, setUrlDirty] = useState(false);

  const handleUrlSave = useCallback(() => {
    const trimmed = urlInput.trim().replace(/\/$/, '');
    if (trimmed && trimmed !== baseUrl) {
      setBaseUrl(trimmed);
    }
    setUrlDirty(false);
  }, [urlInput, baseUrl, setBaseUrl]);

  const statusConfig = {
    idle:         { icon: <Wifi className="w-3.5 h-3.5" />,                      color: 'text-muted-foreground', label: 'Not checked' },
    checking:     { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,      color: 'text-amber-400',        label: 'Connecting…' },
    connected:    { icon: <CheckCircle2 className="w-3.5 h-3.5" />,              color: 'text-green-400',        label: `Connected — v${version ?? '?'}` },
    disconnected: { icon: <WifiOff className="w-3.5 h-3.5" />,                   color: 'text-destructive',      label: 'Offline — mock mode active' },
  };
  const sc = statusConfig[status];

  const presets = Object.entries(SYSTEM_PROMPT_PRESETS);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2>Settings</h2>
          <p className="text-xs text-muted-foreground">Model behavior and UI preferences</p>
        </div>
        <button
          onClick={resetSettings}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          Reset defaults
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full px-6 py-6 space-y-8">

        {/* ── Ollama Connection ─────────────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Wifi className="w-4 h-4" />}
            title="Ollama Connection"
            description="Configure your local Ollama server endpoint"
          />

          {/* Status row */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs ${
            status === 'connected'    ? 'bg-green-400/10 border border-green-400/20' :
            status === 'disconnected' ? 'bg-destructive/10 border border-destructive/20' :
            status === 'checking'     ? 'bg-amber-400/10 border border-amber-400/20' :
            'bg-muted border border-border/50'
          }`}>
            <span className={sc.color}>{sc.icon}</span>
            <span className={sc.color}>{sc.label}</span>
            <button
              onClick={checkConnection}
              disabled={status === 'checking'}
              className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Recheck connection"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Endpoint URL */}
          <div className="space-y-1.5 mb-4">
            <label className="text-xs text-muted-foreground">Endpoint URL</label>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlDirty(true); }}
                onKeyDown={e => e.key === 'Enter' && handleUrlSave()}
                placeholder="http://localhost:11434"
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
              {urlDirty && (
                <button
                  onClick={handleUrlSave}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-all flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              )}
            </div>
          </div>

          {/* Real mode toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border/30">
            <div>
              <label className="text-sm text-foreground">Use Real Ollama</label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When connected, send requests to Ollama instead of mock responses
              </p>
            </div>
            <button
              onClick={() => setUseRealMode(!useRealMode)}
              disabled={status !== 'connected'}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
                useRealMode && status === 'connected' ? 'bg-primary' : 'bg-switch-background'
              }`}
            >
              <span className={`block h-3.5 w-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                useRealMode && status === 'connected' ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {status === 'disconnected' && (
            <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p>Make sure Ollama is running: <code className="bg-muted px-1 py-0.5 rounded text-foreground">ollama serve</code></p>
                <p className="mt-1">If Ollama is on a different host, update the endpoint URL above and ensure CORS is configured:
                  {' '}<code className="bg-muted px-1 py-0.5 rounded text-foreground">OLLAMA_ORIGINS=* ollama serve</code>
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Project Intelligence (RAG) ─────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Brain className="w-4 h-4" />}
            title="Project Intelligence (RAG)"
            description="Index your codebase for semantic search and deep understanding"
          />

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Codebase Index</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">Local Only</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                By indexing your project, the AI can "read" your files and provide much more accurate answers 
                about your architecture and logic. Uses <code className="bg-muted px-1 py-0.5 rounded">nomic-embed-text</code> locally.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const apiBase = (window as any).getApiBase?.() || 'http://localhost:3001';
                    try {
                      await fetch(`${apiBase}/api/rag/index`, { method: 'POST' });
                      alert('Indexing started in the background! Check backend logs for progress.');
                    } catch (e) {
                      alert('Failed to start indexing.');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Index Codebase
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to clear the index?')) return;
                    const apiBase = (window as any).getApiBase?.() || 'http://localhost:3001';
                    try {
                      await fetch(`${apiBase}/api/rag/index`, { method: 'DELETE' });
                      alert('Index cleared.');
                    } catch (e) {
                      alert('Failed to clear index.');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── System Prompt ─────────────────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Brain className="w-4 h-4" />}
            title="System Prompt"
            description="Default persona used for new conversations"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSystemPromptPreset(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  settings.systemPromptPreset === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {settings.systemPromptPreset === key && <Check className="w-3 h-3" />}
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            value={settings.systemPrompt}
            onChange={e => updateSettings({ systemPrompt: e.target.value, systemPromptPreset: 'default' })}
            placeholder="You are a helpful assistant…"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none transition-colors"
          />
          <p className="mt-2 text-[10px] text-muted-foreground italic">
            You can also override this for individual chats using the Persona badge in the chat header.
          </p>
        </section>

        {/* ── Generation Parameters ─────────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Sliders className="w-4 h-4" />}
            title="Generation Parameters"
            description="Control how the model generates responses"
          />

          <div className="space-y-6">
            <SettingSlider
              label="Temperature"
              description="Higher = more creative, Lower = more deterministic"
              value={settings.temperature}
              min={0} max={2} step={0.05}
              onChange={v => updateSettings({ temperature: v })}
              displayValue={settings.temperature.toFixed(2)}
            />
            <SettingSlider
              label="Max Tokens"
              description="Maximum length of the generated response"
              value={settings.maxTokens}
              min={256} max={8192} step={128}
              onChange={v => updateSettings({ maxTokens: v })}
              displayValue={settings.maxTokens.toLocaleString()}
            />
            <SettingSlider
              label="Top P"
              description="Nucleus sampling — cumulative probability threshold"
              value={settings.topP}
              min={0.1} max={1} step={0.05}
              onChange={v => updateSettings({ topP: v })}
              displayValue={settings.topP.toFixed(2)}
            />
            <SettingSlider
              label="Top K"
              description="Limits sampling to top K most likely tokens"
              value={settings.topK}
              min={1} max={100} step={1}
              onChange={v => updateSettings({ topK: v })}
            />
          </div>
        </section>

        {/* ── UI Preferences ────────────────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Monitor className="w-4 h-4" />}
            title="UI Preferences"
            description="Customize the interface to your liking"
          />

          <div className="space-y-1 divide-y divide-border/30">
            <ToggleSetting
              label="Auto Scroll"
              description="Automatically scroll to the latest message while streaming"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            />
            <ToggleSetting
              label="Line Numbers in Code Blocks"
              description="Show line numbers next to code"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
            />
            <ToggleSetting
              label="Animations"
              description="Smooth transitions and motion effects (disable for performance)"
              checked={animationsEnabled}
              onCheckedChange={setAnimationsEnabled}
            />

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm text-foreground">Chat Density</label>
                <p className="text-xs text-muted-foreground mt-0.5">Controls spacing between messages</p>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['compact', 'comfortable'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`px-3 py-1.5 text-xs transition-all capitalize ${
                      density === d
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground bg-transparent'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────────── */}
        <section className="p-5 rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            icon={<Zap className="w-4 h-4" />}
            title="About Ollama Chat"
          />
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono text-foreground">1.5.0-phase2</span>
            </div>
            <div className="flex justify-between">
              <span>Ollama Endpoint</span>
              <span className="font-mono text-foreground truncate ml-4">{baseUrl}</span>
            </div>
            <div className="flex justify-between">
              <span>Ollama Version</span>
              <span className={`font-mono ${status === 'connected' ? 'text-green-400' : 'text-muted-foreground'}`}>
                {version ?? (status === 'checking' ? 'checking…' : 'offline')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mode</span>
              <span className={status === 'connected' && useRealMode ? 'text-green-400' : 'text-amber-400'}>
                {status === 'connected' && useRealMode ? 'Real (Ollama)' : 'Mock (simulated)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Token Estimator</span>
              <span className="text-foreground">chars / 4</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}