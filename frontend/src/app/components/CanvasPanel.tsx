import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Monitor, Tablet, Smartphone, RefreshCw, Maximize2,
  Code2, Eye, Columns, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../../store/ui.store';
import { Highlight, themes } from 'prism-react-renderer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREVIEW_LANGS = new Set(['html', 'svg', 'css', 'htm', 'jsx', 'tsx', 'js', 'javascript', 'ts', 'typescript', 'react']);

export function isPreviewable(language: string): boolean {
  return PREVIEW_LANGS.has(language.toLowerCase());
}

function wrapForPreview(code: string, lang: string): string {
  const lower = lang.toLowerCase();
  if (lower === 'svg') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#f8fafc;}</style></head><body>${code}</body></html>`;
  }
  if (lower === 'css') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;padding:24px;background:#fff;}${code}</style></head><body><div class="demo"><h1>Heading</h1><p>Paragraph text demonstrating styles.</p><button>Button</button><ul><li>Item one</li><li>Item two</li></ul></div></body></html>`;
  }
  if (['jsx', 'tsx', 'react', 'js', 'javascript', 'ts', 'typescript'].includes(lower)) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #fff; margin: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${code}
      const Target = typeof App !== 'undefined' ? App : (typeof Component !== 'undefined' ? Component : null);
      if (Target) {
        ReactDOM.createRoot(document.getElementById('root')).render(<Target />);
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="color:red;padding:16px;"><strong>Render Error:</strong> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
  }
  if (code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html')) return code;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;padding:20px;margin:0;}</style></head><body>${code}</body></html>`;
}

// ─── Device presets ───────────────────────────────────────────────────────────

type DeviceMode = 'full' | 'desktop' | 'tablet' | 'mobile';

const DEVICES: { id: DeviceMode; label: string; width: string; icon: React.ReactNode }[] = [
  { id: 'full',    label: 'Fill',    width: '100%',  icon: <Maximize2 className="w-3.5 h-3.5" /> },
  { id: 'desktop', label: 'Desktop', width: '1280px', icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'tablet',  label: 'Tablet',  width: '768px',  icon: <Tablet className="w-3.5 h-3.5" /> },
  { id: 'mobile',  label: 'Mobile',  width: '375px',  icon: <Smartphone className="w-3.5 h-3.5" /> },
];

// ─── View mode tabs ───────────────────────────────────────────────────────────

type ViewMode = 'preview' | 'code' | 'split';

// ─── Main Component ───────────────────────────────────────────────────────────

export function CanvasPanel() {
  const { canvasOpen, canvasCode, canvasLanguage, closeCanvas } = useUIStore();
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [device, setDevice] = useState<DeviceMode>('full');
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = wrapForPreview(canvasCode, canvasLanguage);

  const handleRefresh = useCallback(() => {
    setIframeError(false);
    setRefreshKey(k => k + 1);
  }, []);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!canvasOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCanvas(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canvasOpen, closeCanvas]);

  const deviceWidth = DEVICES.find(d => d.id === device)?.width ?? '100%';
  const langNorm = canvasLanguage.toLowerCase();
  const langDisplay = { html: 'HTML', svg: 'SVG', css: 'CSS', htm: 'HTML' }[langNorm] ?? canvasLanguage.toUpperCase();

  return (
    <AnimatePresence>
      {canvasOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closeCanvas}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-background border-l border-border shadow-2xl"
            style={{ width: 'min(680px, 96vw)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
              {/* Lang badge */}
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono">{langDisplay}</span>

              {/* View mode */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted ml-2">
                {([
                  { id: 'preview', icon: <Eye className="w-3 h-3" />, label: 'Preview' },
                  { id: 'code',    icon: <Code2 className="w-3 h-3" />, label: 'Code' },
                  { id: 'split',   icon: <Columns className="w-3 h-3" />, label: 'Split' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                      viewMode === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Device picker (only for preview/split) */}
              {viewMode !== 'code' && (
                <div className="flex items-center gap-0.5 ml-2">
                  {DEVICES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDevice(d.id)}
                      title={d.label}
                      className={`p-1.5 rounded-md transition-all ${device === d.id ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                    >
                      {d.icon}
                    </button>
                  ))}
                </div>
              )}

              <div className="ml-auto flex items-center gap-1">
                {viewMode !== 'code' && (
                  <button onClick={handleRefresh} title="Refresh preview" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={closeCanvas} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Preview pane */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="flex flex-col flex-1 min-w-0 bg-[#f8fafc] overflow-hidden">
                  <div className="flex-1 overflow-auto flex justify-center p-2">
                    <div
                      className="relative h-full rounded-lg overflow-hidden shadow-lg transition-all duration-300 bg-white"
                      style={{ width: deviceWidth, minWidth: '200px', maxWidth: '100%' }}
                    >
                      {iframeError ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
                          <p className="text-sm text-foreground mb-1">Preview error</p>
                          <p className="text-xs text-muted-foreground">The code couldn't be rendered.</p>
                          <button onClick={handleRefresh} className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-xs text-muted-foreground hover:text-foreground transition-all">
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      ) : (
                        <iframe
                          key={refreshKey}
                          ref={iframeRef}
                          srcDoc={srcDoc}
                          sandbox="allow-scripts allow-same-origin"
                          className="w-full h-full border-none block"
                          title="Canvas Preview"
                          onError={() => setIframeError(true)}
                        />
                      )}
                    </div>
                  </div>
                  {/* Footer bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 bg-background/80 text-[10px] text-muted-foreground/50">
                    <span>sandbox:allow-scripts</span>
                    <span className="ml-auto">{deviceWidth}</span>
                  </div>
                </div>
              )}

              {/* Divider */}
              {viewMode === 'split' && <div className="w-px bg-border/50 shrink-0" />}

              {/* Code pane */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div className="flex flex-col min-w-0 overflow-hidden" style={{ flex: viewMode === 'split' ? '0 0 50%' : '1' }}>
                  <div className="flex-1 overflow-auto">
                    <Highlight
                      theme={themes.nightOwl}
                      code={canvasCode}
                      language={langNorm as any}
                    >
                      {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre
                          className={`${className} text-sm leading-relaxed p-4 m-0 min-h-full`}
                          style={{ ...style, background: '#0d0d17', margin: 0 }}
                        >
                          {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line })} className="flex">
                              <span className="select-none text-right text-white/20 text-xs w-7 mr-4 shrink-0 leading-[1.625]">{i + 1}</span>
                              <span className="flex-1">{line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}</span>
                            </div>
                          ))}
                        </pre>
                      )}
                    </Highlight>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
