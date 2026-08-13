import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { ExternalLink, FileText } from 'lucide-react';
import type { Source } from '../../types';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  sources?: Source[];
}

/**
 * Citation Badge component for [[Web Source n]] or [[File: path]]
 */
function CitationBadge({ type, id, label, url }: { type: 'web' | 'file'; id?: string; label: string; url?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    // We could also trigger a UI scroll to the sidebar here
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md 
        text-[10px] font-medium transition-all active:scale-95
        ${type === 'web' 
          ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20' 
          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'}
      `}
    >
      {type === 'web' ? <ExternalLink className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
      {label}
    </button>
  );
}

export function MarkdownRenderer({ content, className = '', sources = [] }: MarkdownRendererProps) {
  // Regex to find [[Web Source n]]
  const webRegex = /\[\[Web Source (\d+)\]\]/g;
  // Regex to find [[File: path]]
  const fileRegex = /\[\[File: (.+?)\]\]/g;

  // Pre-process content to handle citations if they aren't handled by custom components easily
  // Actually, we can use a custom component for the text, but react-markdown 
  // makes it easier to just use a custom component for specific markdown patterns.
  // We'll turn them into "pseudo-links" then handle those links.
  
  const processedContent = content
    .replace(webRegex, (match, n) => {
      const index = parseInt(n) - 1;
      const source = sources[index];
      // Use a special protocol so we can catch it in the 'a' component
      return `[source:${n}](${source?.url || '#'})`;
    })
    .replace(fileRegex, (match, path) => {
      return `[file:${path}](#file-${path})`;
    });

  return (
    <div className={`prose-ai ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom Link handling for citations
          a({ href, children }) {
            const label = String(children);
            
            // Handle Web Source citations
            if (label.startsWith('source:')) {
              const n = label.split(':')[1];
              const source = sources[parseInt(n) - 1];
              return (
                <CitationBadge 
                  type="web" 
                  label={source?.domain || `Source ${n}`} 
                  url={href}
                />
              );
            }

            // Handle File citations
            if (label.startsWith('file:')) {
              const path = label.split(':')[1];
              return (
                <CitationBadge 
                  type="file" 
                  label={path.split('/').pop() || path} 
                />
              );
            }

            // Normal links
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },

          // Code blocks
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !(props as any).inline && !String(children).includes('\n');
            
            // If it's a block (multi-line or has a language), use CodeBlock
            if (match || String(children).includes('\n')) {
              return (
                <CodeBlock
                  language={match ? match[1] : 'javascript'} // Default to JS if multi-line but no lang
                  code={String(children).replace(/\n$/, '')}
                />
              );
            }

            // Otherwise, it's inline code
            return (
              <code className="bg-white/10 dark:bg-white/10 text-violet-300 rounded px-1.5 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },

          // Typography components
          pre: ({ children }) => <>{children}</>,
          h1: ({ children }) => <h1 className="text-foreground mt-6 mb-3 pb-2 border-b border-border/50">{children}</h1>,
          h2: ({ children }) => <h2 className="text-foreground mt-5 mb-2.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-foreground mt-4 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-foreground mt-3 mb-1.5">{children}</h4>,
          p: ({ children }) => <p className="text-foreground leading-relaxed mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-3 space-y-1.5 pl-5 list-disc marker:text-primary/60">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-primary/60">{children}</ol>,
          li: ({ children }) => <li className="text-foreground leading-relaxed pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-2 border-primary/50 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border/30">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-xs text-muted-foreground tracking-wider border-b border-border/50">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-4 py-2.5 text-foreground">{children}</td>,
          hr: () => <hr className="my-4 border-border/30" />,
          strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-foreground/90">{children}</em>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}