import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import { AlertTriangle, Check, ChevronDown, Download, Menu, MoreHorizontal, PanelRight, Share2, Trash2, X, Zap, Loader2, Brain, Sparkles, Ghost, Shield, GraduationCap, PenTool, Search as SearchIcon, Settings2, Cpu, HardDrive } from 'lucide-react';
import type { Chat } from '../../types';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';
import { useUIStore } from '../../store/ui.store';
import { useConnectionStore } from '../../store/connection.store';
import { estimateTokens, SYSTEM_PROMPT_PRESETS } from '../../services/model.service';

interface ChatHeaderProps {
  chat?: Chat | null;
}

// ─── Token Usage Bar ──────────────────────────────────────────────────────────

function ChatSettings({ chat, globalLimit }: { chat: Chat; globalLimit: number }) {
  const { updateChatSettings } = useChatStore();
  const currentLimit = chat.contextLimit || globalLimit;

  // Determine if it's likely using GPU or CPU based on size
  // 8GB is the cutoff for most consumer GPUs (like RTX 4060 Ti)
  const isLikelyGPU = currentLimit <= 12288; // 12k or less
  const isLikelyCPU = currentLimit > 16384; // Over 16k

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className="flex items-center gap-2 group cursor-pointer outline-none">
          <ContextBar chat={chat} globalLimit={globalLimit} />
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-2xl border border-border bg-popover shadow-2xl p-4 animate-in fade-in-0 zoom-in-95"
          sideOffset={8}
          align="end"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Memory Settings</h3>
            </div>
            <Popover.Close className="p-1 rounded-md hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" />
            </Popover.Close>
          </div>

          <div className="space-y-6">
            {/* Context Limit Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                  Context Limit
                </label>
                <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-primary">
                  {currentLimit >= 1000 ? `${(currentLimit / 1000).toFixed(0)}K` : currentLimit} tokens
                </span>
              </div>
              
              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[currentLimit]}
                max={131072}
                min={2048}
                step={2048}
                onValueChange={([val]) => updateChatSettings(chat.id, { contextLimit: val })}
              >
                <Slider.Track className="bg-border/50 relative grow rounded-full h-[3px]">
                  <Slider.Range className="absolute bg-primary rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-4 h-4 bg-primary shadow-lg rounded-full hover:scale-110 focus:outline-none transition-transform cursor-grab active:cursor-grabbing border-2 border-background"
                  aria-label="Context Limit"
                />
              </Slider.Root>

              <div className="flex justify-between items-center px-0.5">
                <span className="text-[10px] text-muted-foreground">2K</span>
                <span className="text-[10px] text-muted-foreground">128K</span>
              </div>
            </div>

            {/* Hardware Prediction */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border/30 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Hardware Affinity</p>
              
              <div className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${isLikelyGPU ? 'bg-green-500/10 border border-green-500/20' : 'opacity-40'}`}>
                <Cpu className={`w-4 h-4 ${isLikelyGPU ? 'text-green-400' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold ${isLikelyGPU ? 'text-green-400' : 'text-muted-foreground'}`}>GPU Acceleration</p>
                  <p className="text-[9px] text-muted-foreground truncate">Fast response, stays in VRAM.</p>
                </div>
                {isLikelyGPU && <Check className="w-3 h-3 text-green-400" />}
              </div>

              <div className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${isLikelyCPU ? 'bg-amber-500/10 border border-amber-500/20' : 'opacity-40'}`}>
                <HardDrive className={`w-4 h-4 ${isLikelyCPU ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold ${isLikelyCPU ? 'text-amber-400' : 'text-muted-foreground'}`}>System RAM (Slow)</p>
                  <p className="text-[9px] text-muted-foreground truncate">Deep context, heavy RAM usage.</p>
                </div>
                {isLikelyCPU && <Check className="w-3 h-3 text-amber-400" />}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => updateChatSettings(chat.id, { contextLimit: undefined })}
                className="w-full py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                Reset to Global (8K)
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ContextBar({ chat, globalLimit }: { chat: Chat; globalLimit: number }) {
  const currentLimit = chat.contextLimit || globalLimit;
  const totalChars = chat.messages.reduce((sum, m) => sum + m.content.length, 0);
  const tokens = Math.ceil(totalChars / 4);
  const usage = Math.min(tokens / currentLimit, 1);
  const percentage = Math.round(usage * 100);

  const color =
    usage > 0.85 ? 'bg-destructive' : usage > 0.65 ? 'bg-amber-400' : 'bg-primary';

  const label =
    tokens >= 1000
      ? `${(tokens / 1000).toFixed(1)}K`
      : `${tokens}`;
  const limitLabel =
    currentLimit >= 1000
      ? `${(currentLimit / 1000).toFixed(0)}K`
      : `${currentLimit}`;

  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      {usage > 0.65 && (
        <AlertTriangle className={`w-3.5 h-3.5 ${usage > 0.85 ? 'text-destructive' : 'text-amber-400'}`} />
      )}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors">
        <div className="w-20 h-1.5 rounded-full bg-border/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap group-hover:text-foreground">
          <Zap className="inline w-2.5 h-2.5 mr-0.5" />
          {label} / {limitLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Persona Selector ─────────────────────────────────────────────────────────

function PersonaSelector({ chat }: { chat: Chat }) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(chat.systemPrompt ?? '');
  const [newName, setNewName] = useState('');
  const { updateChatSystemPrompt } = useChatStore();
  const { settings: globalSettings, customPresets, saveCustomPreset, deleteCustomPreset } = useModelStore();

  const activePresetKey = chat.systemPromptPreset ?? 'default';
  const allPresets = { ...SYSTEM_PROMPT_PRESETS, ...customPresets };
  const activePreset = allPresets[activePresetKey] || allPresets.default;

  const getIcon = (key: string) => {
    if (key.startsWith('custom-')) return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    switch (key) {
      case 'developer': return <Zap className="w-3.5 h-3.5" />;
      case 'analyst': return <SearchIcon className="w-3.5 h-3.5" />;
      case 'writer': return <PenTool className="w-3.5 h-3.5" />;
      case 'tutor': return <GraduationCap className="w-3.5 h-3.5" />;
      default: return <Brain className="w-3.5 h-3.5" />;
    }
  };

  const handleSaveToChat = () => {
    updateChatSystemPrompt(chat.id, prompt, 'custom');
    setEditing(false);
  };

  const handleCreatePreset = () => {
    if (!newName.trim() || !prompt.trim()) return;
    const id = saveCustomPreset(newName.trim(), prompt);
    updateChatSystemPrompt(chat.id, prompt, id);
    setNewName('');
    setEditing(false);
  };

  const selectPreset = (key: string) => {
    const preset = allPresets[key];
    if (preset) {
      updateChatSystemPrompt(chat.id, preset.prompt, key);
      setPrompt(preset.prompt);
    }
  };

  return (
    <DropdownMenu.Root open={editing ? true : undefined} onOpenChange={o => !o && (setEditing(false), setNewName(''))}>
      <DropdownMenu.Trigger asChild>
        <button className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs group ${
          chat.systemPromptPreset && chat.systemPromptPreset !== 'default'
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-muted border-border/50 text-muted-foreground hover:text-foreground'
        }`}>
          {getIcon(activePresetKey)}
          <span className="max-w-[80px] truncate hidden sm:inline">
            {activePresetKey === 'default' ? 'Persona' : activePreset.label}
          </span>
          <ChevronDown className="w-3 h-3 group-data-[state=open]:rotate-180 transition-transform" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[340px] max-w-[420px] rounded-xl border border-border bg-popover shadow-2xl p-2 animate-in fade-in-0 zoom-in-95"
          sideOffset={8}
          align="start"
        >
          <div className="px-2 pb-2 pt-1 border-b border-border/30 mb-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Chat Persona</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Customize behavior or save as a reusable preset.</p>
          </div>

          <div className="max-h-[200px] overflow-y-auto mb-3 custom-scrollbar p-1">
            <p className="px-1 mb-1.5 text-[9px] text-muted-foreground uppercase font-bold opacity-50">Standard</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(SYSTEM_PROMPT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => selectPreset(key)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all border ${
                    activePresetKey === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-accent'
                  }`}
                >
                  {getIcon(key)}
                  {preset.label}
                </button>
              ))}
            </div>

            {Object.keys(customPresets).length > 0 && (
              <>
                <p className="px-1 mb-1.5 text-[9px] text-muted-foreground uppercase font-bold opacity-50">Custom</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(customPresets).map(([key, preset]) => (
                    <div key={key} className="group/item relative">
                      <button
                        onClick={() => selectPreset(key)}
                        className={`flex items-center gap-1.5 px-2 py-1 pr-6 rounded-lg text-[11px] transition-all border ${
                          activePresetKey === key
                            ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                            : 'bg-muted text-muted-foreground border-transparent hover:bg-accent'
                        }`}
                      >
                        {getIcon(key)}
                        {preset.label}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCustomPreset(key); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 opacity-0 group-hover/item:opacity-100 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 p-1">
            <textarea
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setEditing(true); }}
              placeholder="How should the assistant behave?"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none"
            />
            
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={e => { setNewName(e.target.value); setEditing(true); }}
                placeholder="Persona name (to save)"
                className="flex-1 px-2 py-1.5 rounded-lg bg-muted border border-border/50 text-[11px] focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={handleCreatePreset}
                disabled={!newName.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] hover:bg-amber-600 transition-all font-medium disabled:opacity-40"
              >
                Save as New
              </button>
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => {
                  updateChatSystemPrompt(chat.id, globalSettings.systemPrompt, globalSettings.systemPromptPreset);
                  setPrompt(globalSettings.systemPrompt);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to Global
              </button>
              <button
                onClick={handleSaveToChat}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] hover:bg-primary/90 transition-all font-medium"
              >
                Apply to Chat
              </button>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Model Selector ───────────────────────────────────────────────────────────

function ModelSelector() {
  const navigate = useNavigate();
  const { models, activeModelId, setActiveModel } = useModelStore();
  const { status, installedModels, useRealMode } = useConnectionStore();
  const activeModel = models.find(m => m.id === activeModelId);

  // Build merged list: catalog models enriched with installed status
  const installedNames = new Set(installedModels.map(m => m.name));
  // Add installed models not in catalog
  const extraIds = installedModels.filter(m => !models.some(c => c.id === m.name));

  const dotColor =
    status === 'connected' && useRealMode ? 'bg-green-400' :
    status === 'checking'                  ? 'bg-amber-400 animate-pulse' :
    status === 'disconnected'              ? 'bg-destructive/60' :
    'bg-muted-foreground/40';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted hover:bg-accent border border-border/50 transition-all text-sm group">
          {status === 'checking' ? (
            <Loader2 className="w-2 h-2 text-amber-400 animate-spin" />
          ) : (
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          )}
          <span className="text-foreground max-w-[120px] truncate">{activeModel?.name ?? activeModelId}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[260px] rounded-xl border border-border bg-popover shadow-2xl p-1.5 animate-in fade-in-0 zoom-in-95"
          sideOffset={8}
          align="start"
        >
          <div className="px-2 pb-1.5 pt-0.5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Select Model</p>
            {status === 'connected' && useRealMode && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green-400" /> Real mode
              </span>
            )}
            {status === 'disconnected' && (
              <span className="text-[10px] text-amber-400">Mock mode</span>
            )}
          </div>

          {/* Render installed models directly if catalog is empty */}
          {models.length === 0 ? (
            installedModels.map(model => (
              <DropdownMenu.Item
                key={model.name}
                onSelect={() => setActiveModel(model.name)}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors group"
              >
                <div className="mt-0.5">
                  {model.name === activeModelId ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{model.name}</span>
                    <span className="text-[10px] text-green-400">✓</span>
                  </div>
                  {model.details?.parameter_size && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{model.details.parameter_size}</p>
                  )}
                </div>
              </DropdownMenu.Item>
            ))
          ) : (
            <>
              {/* Catalog models */}
              {models.map(model => {
                const isInstalled = installedNames.has(model.id);
                return (
                  <DropdownMenu.Item
                    key={model.id}
                    onSelect={() => setActiveModel(model.id)}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors group"
                  >
                    <div className="mt-0.5">
                      {model.id === activeModelId ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <div className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-foreground">{model.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{model.parameters}</span>
                        {status === 'connected' && isInstalled && (
                          <span className="text-[10px] text-green-400">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
                        {model.description.split('.')[0]}
                      </p>
                    </div>
                  </DropdownMenu.Item>
                );
              })}

              {/* Extra installed models not in catalog */}
              {extraIds.length > 0 && (
                <>
                  <div className="px-2 py-1.5 mt-1 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Other Installed</p>
                  </div>
                  {extraIds.map(model => (
                    <DropdownMenu.Item
                      key={model.name}
                      onSelect={() => setActiveModel(model.name)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors group"
                    >
                      <div className="mt-0.5">
                        {model.name === activeModelId ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <div className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{model.name}</span>
                          <span className="text-[10px] text-green-400">✓</span>
                        </div>
                        {model.details?.parameter_size && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{model.details.parameter_size}</p>
                        )}
                      </div>
                    </DropdownMenu.Item>
                  ))}
                </>
              )}
            </>
          )}

          {status === 'connected' && installedModels.length === 0 && models.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No models found in Ollama.</p>
              <button 
                onClick={() => navigate('/models')}
                className="text-[10px] text-primary hover:underline mt-1"
              >
                Go to models page to pull one
              </button>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export function ChatHeader({ chat }: ChatHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { renameChat, clearChat } = useChatStore();
  const { settings } = useModelStore();
  const { toggleSidebar, sidebarOpen, toggleRightPanel } = useUIStore();

  const handleTitleClick = useCallback(() => {
    if (!chat) return;
    setTitleValue(chat.title);
    setIsEditingTitle(true);
  }, [chat]);

  const handleTitleSubmit = useCallback(() => {
    if (chat && titleValue.trim()) {
      renameChat(chat.id, titleValue.trim());
    }
    setIsEditingTitle(false);
  }, [chat, titleValue, renameChat]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') setIsEditingTitle(false);
  }, [handleTitleSubmit]);

  const handleExport = useCallback(() => {
    if (!chat) return;
    const md = chat.messages
      .map(m => `**${m.role === 'user' ? 'You' : 'Assistant'}:**\n\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chat]);

  const handleExportJSON = useCallback(() => {
    if (!chat) return;
    const jsonStr = JSON.stringify(chat, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chat]);

  const handleClear = useCallback(() => {
    if (chat) clearChat(chat.id);
  }, [chat, clearChat]);

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
      {/* Sidebar toggle (when collapsed) */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Model selector */}
      <ModelSelector />

      {/* Persona Selector */}
      {chat && <PersonaSelector chat={chat} />}

      {/* Title */}
      <div className="flex-1 min-w-0">
        {chat ? (
          isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSubmit}
                className="flex-1 min-w-0 text-sm text-foreground bg-transparent border-b border-primary/50 focus:outline-none px-1"
              />
              <button onClick={handleTitleSubmit} className="text-green-400">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleTitleClick}
              className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors truncate max-w-full"
              title="Click to rename"
            >
              <span className="truncate">{chat.title}</span>
            </button>
          )
        ) : (
          <span className="text-sm text-muted-foreground">Select or create a chat</span>
        )}
      </div>

      {/* Chat settings & Context bar */}
      {chat && chat.messages.length > 0 && (
        <div className="hidden md:flex items-center">
          <ChatSettings chat={chat} globalLimit={settings.contextLimit} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[180px] rounded-xl border border-border bg-popover shadow-2xl p-1.5 animate-in fade-in-0 zoom-in-95"
              sideOffset={8}
              align="end"
            >
              <DropdownMenu.Item
                onSelect={handleExport}
                disabled={!chat}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Export as Markdown
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={handleExportJSON}
                disabled={!chat}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors text-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Export as JSON
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={handleClear}
                disabled={!chat}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-destructive/10 cursor-pointer outline-none transition-colors text-sm text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Chat
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Right panel toggle */}
        <button
          onClick={toggleRightPanel}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all hidden md:flex"
          title="Toggle right panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}