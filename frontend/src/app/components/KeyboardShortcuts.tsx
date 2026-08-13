import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUIStore } from '../../store/ui.store';

const SHORTCUTS = [
  { group: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'],  label: 'Open command bar' },
      { keys: ['Ctrl', 'N'],  label: 'New chat' },
      { keys: ['Ctrl', ','],  label: 'Open settings' },
      { keys: ['?'],          label: 'Keyboard shortcuts' },
    ],
  },
  { group: 'Chat',
    items: [
      { keys: ['Enter'],            label: 'Send message' },
      { keys: ['Shift', 'Enter'],   label: 'New line in input' },
      { keys: ['Esc'],              label: 'Stop generation / cancel' },
      { keys: ['Ctrl', 'Shift', 'C'], label: 'Copy last response' },
    ],
  },
  { group: 'Interface',
    items: [
      { keys: ['Ctrl', 'B'],  label: 'Toggle sidebar' },
      { keys: ['Ctrl', 'P'],  label: 'Toggle right panel' },
      { keys: ['Ctrl', '/'],  label: 'Toggle canvas preview' },
      { keys: ['Ctrl', 'D'],  label: 'Toggle dark / light mode' },
    ],
  },
  { group: 'Branching',
    items: [
      { keys: ['Click', '✎'],          label: 'Edit user message (fork)' },
      { keys: ['Click', '↺ ▾'],        label: 'Smart regenerate menu' },
      { keys: ['◀', '▶ on branch pill'], label: 'Navigate branches' },
    ],
  },
];

export function KeyboardShortcuts() {
  const { shortcutsOpen, setShortcutsOpen } = useUIStore();

  // Ctrl+? / just ? when not in input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === '?' && !inInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (e.key === 'Escape' && shortcutsOpen) setShortcutsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsOpen, setShortcutsOpen]);

  return (
    <AnimatePresence>
      {shortcutsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShortcutsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-50 top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
              <Keyboard className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-foreground">Keyboard Shortcuts</h3>
                <p className="text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">?</kbd> to toggle this panel</p>
              </div>
              <button onClick={() => setShortcutsOpen(false)} className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcut grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 p-6 max-h-[70vh] overflow-y-auto">
              {SHORTCUTS.map(section => (
                <div key={section.group} className="mb-6 pr-4">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">{section.group}</p>
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((key, ki) => (
                            <span key={ki} className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-[10px] text-foreground font-mono whitespace-nowrap">{key}</kbd>
                              {ki < item.keys.length - 1 && <span className="text-[10px] text-muted-foreground/40">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-border/30 text-center">
              <p className="text-[10px] text-muted-foreground/40">Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> to close</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
