import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send, Square, Paperclip, Mic, Search, FileText,
  BrainCircuit, Code2, X, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useChatStore, getApiBase } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';

const DRAFT_KEY = 'ollama-input-draft';

interface ToolToggle {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64?: string;
  preview?: string;
  textContent?: string;
}

export function InputArea() {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [tools, setTools] = useState<ToolToggle[]>([
    { id: 'search', label: 'Search', icon: <Search className="w-3.5 h-3.5" />, active: false },
    { id: 'files', label: 'Files', icon: <FileText className="w-3.5 h-3.5" />, active: false },
    { id: 'memory', label: 'Memory', icon: <BrainCircuit className="w-3.5 h-3.5" />, active: false },
    { id: 'code', label: 'Code', icon: <Code2 className="w-3.5 h-3.5" />, active: false },
  ]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { sendMessage, stopGeneration, isStreaming } = useChatStore();
  const { activeModelId, settings } = useModelStore();

  // ── Draft recovery on mount ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved && saved.trim()) {
        setInput(saved);
        setRecoveredDraft(true);
      }
    } catch {
      // localStorage unavailable (e.g. private mode restrictions)
    }
  }, []);

  // ── Auto-save draft (debounced 600ms) ────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (input.trim()) {
          localStorage.setItem(DRAFT_KEY, input);
        } else {
          localStorage.removeItem(DRAFT_KEY);
          setRecoveredDraft(false);
        }
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [input]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || isStreaming) return;

    const currentAttached = [...attachedFiles];

    setInput('');
    setAttachedFiles([]);
    setRecoveredDraft(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let targetChatId = useChatStore.getState().activeChatId;
    if (!targetChatId) {
      const { createChat } = useChatStore.getState();
      targetChatId = await createChat(activeModelId);
      navigate(`/chat/${targetChatId}`);
    }

    const toolState = {
      search: tools.find(t => t.id === 'search')?.active,
      files: tools.find(t => t.id === 'files')?.active,
      memory: tools.find(t => t.id === 'memory')?.active,
    };

    const imageBase64s = currentAttached
      .filter(f => f.type.startsWith('image/') && f.base64)
      .map(f => f.base64!);

    const textAttachments = currentAttached
      .filter(f => f.textContent)
      .map(f => `[ATTACHMENT: ${f.name}]\n${f.textContent}\n[END ATTACHMENT]`)
      .join('\n\n');

    const fullPrompt = textAttachments
      ? `${textAttachments}\n\n${trimmed}`
      : trimmed;

    sendMessage(fullPrompt, activeModelId, {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      contextLimit: settings.contextLimit,
      systemPrompt: settings.systemPrompt,
    }, toolState, imageBase64s).catch(() => {});

    // Reset tools after send
    setTools(prev => prev.map(t => ({ ...t, active: false })));
  }, [input, attachedFiles, isStreaming, sendMessage, activeModelId, settings, navigate, tools]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

function compressImageFile(file: File, maxDimension = 1024, quality = 0.85): Promise<{ pureBase64: string; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const pureBase64 = dataUrl.split(',')[1];
          resolve({ pureBase64, dataUrl });
        } else {
          const originalDataUrl = e.target?.result as string;
          resolve({ pureBase64: originalDataUrl.split(',')[1], dataUrl: originalDataUrl });
        }
      };
      img.onerror = () => {
        const originalDataUrl = e.target?.result as string;
        resolve({ pureBase64: originalDataUrl.split(',')[1], dataUrl: originalDataUrl });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function extractPdfTextWithPdfJs(file: File): Promise<string> {
  try {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PDF.js script load failed'));
        document.head.appendChild(script);
      });
    }
    const lib = (window as any).pdfjsLib;
    if (!lib) return '';
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const tokenizedText = await page.getTextContent();
      const pageText = tokenizedText.items
        .map((item: any) => item.str)
        .join(' ');
      if (pageText.trim()) {
        fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      }
    }

    return fullText.trim();
  } catch (err) {
    console.warn('[PDF.js Text Extraction Error]', err);
    return '';
  }
}

async function readTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    // 1. Try browser PDF.js tokenized text extraction (Extracts full text across all pages)
    const pdfJsText = await extractPdfTextWithPdfJs(file);
    if (pdfJsText && pdfJsText.length > 20) {
      return pdfJsText.slice(0, 30000);
    }

    // 2. Try backend pdf-parse endpoint
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/files/parse-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.text && data.text.trim()) {
          return data.text.trim().slice(0, 30000);
        }
      }
    } catch (err) {
      console.error('[PDF Parse Backend Error]', err);
    }

    return `[Attached PDF File: ${file.name}]`;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = (e.target?.result as string) || '';
      resolve(result.slice(0, 30000));
    };
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

async function convertPdfToImage(file: File): Promise<{ pureBase64: string; dataUrl: string } | null> {
  try {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PDF.js script load failed'));
        document.head.appendChild(script);
      });
    }
    const lib = (window as any).pdfjsLib;
    if (!lib) return null;
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const pureBase64 = dataUrl.split(',')[1];
    return { pureBase64, dataUrl };
  } catch (err) {
    console.warn('[PDF to Image Render Error]', err);
    return null;
  }
}

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        try {
          const { pureBase64, dataUrl } = await compressImageFile(f);
          const newImage: AttachedFile = {
            id: crypto.randomUUID(),
            name: f.name,
            size: f.size,
            type: f.type,
            base64: pureBase64,
            preview: dataUrl
          };
          setAttachedFiles(prev => [...prev, newImage]);
        } catch (e) {
          console.error('[Image Compression Error]', e);
        }
      } else {
        const textContent = await readTextFromFile(f);
        let pdfRender: { pureBase64: string; dataUrl: string } | null = null;
        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          pdfRender = await convertPdfToImage(f);
        }

        const newFile: AttachedFile = {
          id: crypto.randomUUID(),
          name: f.name,
          size: f.size,
          type: f.type,
          textContent,
          preview: pdfRender?.dataUrl,
        };
        setAttachedFiles(prev => [...prev, newFile]);
      }
    }
    e.target.value = '';
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const toggleTool = useCallback((id: string) => {
    setTools(prev =>
      prev.map(t => (t.id === id ? { ...t, active: !t.active } : t))
    );
  }, []);

  const dismissDraft = useCallback(() => {
    setInput('');
    setRecoveredDraft(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  const canSend = input.trim().length > 0 && !isStreaming;
  const charCount = input.length;

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 md:px-6 py-3">
      <div className="max-w-3xl mx-auto">

        {/* Recovered draft banner */}
        <AnimatePresence>
          {recoveredDraft && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs text-amber-400"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span className="flex-1">Draft recovered from your last session</span>
              <button
                onClick={dismissDraft}
                className="p-0.5 rounded hover:bg-amber-400/20 transition-colors"
                title="Dismiss draft"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attached files */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2 pt-1"
            >
              {attachedFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground group/file"
                >
                  {file.preview ? (
                    <img src={file.preview} alt="" className="w-5 h-5 rounded object-cover border border-border/50" />
                  ) : (
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input container */}
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/50 focus-within:shadow-primary/10 focus-within:shadow-md transition-all duration-200">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2.5 mb-1 ml-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.yaml,.yml,.csv,image/*"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              const val = e.target.value;
              setInput(val);
              
              // Simple heuristic: if user starts with /web or /search, toggle search tool
              if (val.toLowerCase().startsWith('/web ') || val.toLowerCase().startsWith('/search ')) {
                setTools(prev => prev.map(t => t.id === 'search' ? { ...t, active: true } : t));
              } else if (val === '' || !val.includes('/')) {
                // optional: revert if cleared
              }
            }}
            onKeyDown={handleKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                // Manually trigger the handleFileChange logic or a variation
                const event = { target: { files } } as any;
                handleFileChange(event);
              }
            }}
            placeholder="Message the assistant… (Shift+Enter for new line)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground/50 py-3 text-sm leading-relaxed focus:outline-none disabled:cursor-not-allowed min-h-[44px]"
            style={{ maxHeight: '200px' }}
          />

          {/* Character count */}
          {charCount > 800 && (
            <span className={`shrink-0 text-[10px] mb-3 ${charCount > 1500 ? 'text-destructive' : 'text-muted-foreground/50'}`}>
              {charCount.toLocaleString()}
            </span>
          )}

          {/* Voice button */}
          <button
            className="shrink-0 p-2.5 mb-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all"
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send / Stop button */}
          <div className="shrink-0 mb-1 mr-1">
            {isStreaming ? (
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={stopGeneration}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-destructive/20 hover:bg-destructive/30 text-destructive transition-all"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSend}
                disabled={!canSend}
                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                  canSend
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Tool toggles + info row */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                  tool.active
                    ? 'bg-primary/15 text-primary border border-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
                }`}
              >
                {tool.icon}
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
              Enter to send · Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
