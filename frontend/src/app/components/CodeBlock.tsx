import { useState, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check, ChevronDown, ChevronUp, Maximize2, Play, Terminal, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { getApiBase } from '../../store/chat.store';
import { isPreviewable } from './CanvasPanel';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  className?: string;
}

const LANG_DISPLAY: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  bash: 'Bash',
  sh: 'Shell',
  sql: 'SQL',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  markdown: 'Markdown',
  md: 'Markdown',
  text: 'Plain Text',
  txt: 'Plain Text',
};

const LANG_NORMALIZE: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
};

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  return LANG_NORMALIZE[lower] ?? lower;
}

const LANG_COLORS: Record<string, string> = {
  javascript: 'text-yellow-400',
  typescript: 'text-blue-400',
  python: 'text-green-400',
  rust: 'text-orange-400',
  go: 'text-cyan-400',
  sql: 'text-purple-400',
  bash: 'text-gray-300',
  json: 'text-amber-400',
  html: 'text-red-400',
  css: 'text-pink-400',
};

const COLLAPSE_THRESHOLD = 20; // lines

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{ stdout?: string; stderr?: string; error?: string } | null>(null);
  const { showLineNumbers, openCanvas } = useUIStore();

  const normalLang = normalizeLanguage(language);
  const displayName = LANG_DISPLAY[normalLang] ?? language.charAt(0).toUpperCase() + language.slice(1);
  const langColor = LANG_COLORS[normalLang] ?? 'text-muted-foreground';
  const lineCount = code.split('\n').length;
  const canCollapse = lineCount > COLLAPSE_THRESHOLD;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const handleRun = async () => {
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: normalLang, code }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionOutput({ stdout: data.output, stderr: data.error });
      } else {
        setExecutionOutput({ error: data.error, stdout: data.output, stderr: data.stderr });
      }
    } catch (e: any) {
      setExecutionOutput({ error: e.message || 'Network error during execution' });
    } finally {
      setIsExecuting(false);
    }
  };

  const isRunnable = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java'].includes(normalLang);

  const displayCode = collapsed ? code.split('\n').slice(0, 8).join('\n') + '\n...' : code;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d0d17]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03]">
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-medium font-mono ${langColor}`}>
            {displayName}
          </span>
          {filename && (
            <span className="text-xs text-muted-foreground">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canCollapse && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? (
                <><ChevronDown className="w-3 h-3" /><span>{lineCount} lines</span></>
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          )}
          {isPreviewable(normalLang) && (
            <button
              onClick={() => openCanvas(code, normalLang)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-white/[0.06] transition-all duration-150"
              title="Open in Canvas preview"
            >
              <Play className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}
          {isRunnable && (
            <button
              onClick={handleRun}
              disabled={isExecuting}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 ${
                isExecuting 
                ? 'text-primary bg-primary/10 cursor-not-allowed' 
                : 'text-muted-foreground hover:text-emerald-400 hover:bg-white/[0.06]'
              }`}
              title="Run code locally"
            >
              {isExecuting ? (
                <><Loader2 className="w-3 h-3 animate-spin" /><span>Running...</span></>
              ) : (
                <><Terminal className="w-3 h-3" /><span>Run</span></>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-150"
            title="Copy code"
          >
            {copied ? (
              <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></>
            ) : (
              <><Copy className="w-3 h-3" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <Highlight
          theme={themes.nightOwl}
          code={displayCode}
          language={normalLang as Parameters<typeof Highlight>[0]['language']}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} text-sm leading-relaxed p-4 m-0 bg-transparent overflow-x-auto`}
              style={{ ...style, background: 'transparent', margin: 0 }}
            >
              {tokens.map((line, i) => (
                <div
                  key={i}
                  {...getLineProps({ line })}
                  className="flex"
                >
                  {showLineNumbers && !collapsed && (
                    <span className="select-none text-right text-white/20 text-xs w-7 min-w-[1.75rem] mr-4 shrink-0 leading-[1.625]">
                      {i + 1}
                    </span>
                  )}
                  <span className="flex-1">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>

      {/* Collapsed footer */}
      {collapsed && canCollapse && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-1.5 border-t border-white/[0.06]"
        >
          <Maximize2 className="w-3 h-3" />
          Show {lineCount - 8} more lines
        </button>
      )}

      {/* Execution Output */}
      {executionOutput && (
        <div className="border-t border-white/[0.06] bg-black/40 font-mono text-[11px]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-wider font-bold text-[9px]">
              <Terminal className="w-2.5 h-2.5" />
              <span>Execution Output</span>
            </div>
            <button 
              onClick={() => setExecutionOutput(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3 overflow-x-auto max-h-[300px]">
            {executionOutput.error && (
              <div className="flex items-start gap-2 text-red-400 mb-2 whitespace-pre-wrap">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{executionOutput.error}</span>
              </div>
            )}
            {executionOutput.stdout && (
              <div className="text-emerald-400 whitespace-pre-wrap">
                {executionOutput.stdout}
              </div>
            )}
            {executionOutput.stderr && !executionOutput.error && (
              <div className="text-orange-400 whitespace-pre-wrap mt-2">
                {executionOutput.stderr}
              </div>
            )}
            {!executionOutput.stdout && !executionOutput.error && !executionOutput.stderr && (
              <div className="text-muted-foreground italic">Code executed successfully with no output.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}