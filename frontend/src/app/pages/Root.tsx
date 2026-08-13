import { Outlet, useNavigate, useLocation } from 'react-router';
import { useEffect } from 'react';
import { MessageSquare, Cpu, Settings as SettingsIcon, GitCompare } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { ChatHeader } from '../components/ChatHeader';
import { RightPanel } from '../components/RightPanel';
import { CommandBar } from '../components/CommandBar';
import { CanvasPanel } from '../components/CanvasPanel';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { useChatStore } from '../../store/chat.store';
import { useUIStore } from '../../store/ui.store';
import { useConnectionStore } from '../../store/connection.store';

// Mobile bottom nav
function MobileNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { path: '/',        icon: <MessageSquare className="w-5 h-5" />, label: 'Chats'   },
    { path: '/compare', icon: <GitCompare className="w-5 h-5" />,    label: 'Compare' },
    { path: '/models',  icon: <Cpu className="w-5 h-5" />,           label: 'Models'  },
    { path: '/settings',icon: <SettingsIcon className="w-5 h-5" />,  label: 'Settings'},
  ];

  return (
    <div className="flex md:hidden items-center border-t border-border/50 bg-background/90 backdrop-blur-sm">
      {tabs.map(tab => {
        const isActive = tab.path === '/'
          ? (pathname === '/' || pathname.startsWith('/chat'))
          : pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-all ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Root() {
  const location = useLocation();
  const { chats, activeChatId, isStreaming, stopGeneration } = useChatStore();
  const {
    theme, toggleSidebar, toggleRightPanel, toggleTheme,
    canvasOpen, closeCanvas, setShortcutsOpen,
  } = useUIStore();
  const { checkConnection } = useConnectionStore();

  // Apply theme class to root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-detect Ollama on app start + 30s polling
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30_000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;

      // Ctrl+B — toggle sidebar
      if (mod && e.key === 'b') { e.preventDefault(); toggleSidebar(); return; }
      // Ctrl+P — toggle right panel
      if (mod && e.key === 'p') { e.preventDefault(); toggleRightPanel(); return; }
      // Ctrl+D — toggle theme
      if (mod && e.key === 'd') { e.preventDefault(); toggleTheme(); return; }
      // Ctrl+/ — close canvas if open
      if (mod && e.key === '/') { e.preventDefault(); if (canvasOpen) closeCanvas(); return; }

      // Escape — stop generation (CanvasPanel handles its own Escape)
      if (e.key === 'Escape' && !canvasOpen && isStreaming) {
        e.preventDefault();
        stopGeneration();
        return;
      }

      // Ctrl+Shift+C — copy last response
      if (mod && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const lastAsstEl = document.querySelector('[data-last-response]');
        if (lastAsstEl) {
          navigator.clipboard.writeText(lastAsstEl.textContent ?? '');
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar, toggleRightPanel, toggleTheme, canvasOpen, closeCanvas, isStreaming, stopGeneration]);

  const activeChat = activeChatId ? chats.find(c => c.id === activeChatId) : null;
  const isChatRoute = location.pathname === '/' || location.pathname.startsWith('/chat');

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Global overlays */}
      <CommandBar />
      <CanvasPanel />
      <KeyboardShortcuts />

      {/* Left Sidebar — desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header — only on chat routes */}
        {isChatRoute && <ChatHeader chat={activeChat} />}

        {/* Page content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Outlet />
          </main>

          {/* Right panel — desktop */}
          <div className="hidden md:flex h-full">
            <RightPanel />
          </div>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  );
}