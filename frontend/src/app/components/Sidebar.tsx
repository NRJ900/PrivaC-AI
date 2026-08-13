import { useState, useCallback, useMemo } from 'react';
import {
  Plus, Search, Pin, Trash2, Pencil, Check, X,
  Settings, Sun, Moon, ChevronLeft, Bot, MoreHorizontal,
  MessageSquare, Wifi, WifiOff, Loader2, GitCompare, Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useChatStore } from '../../store/chat.store';
import { useUIStore } from '../../store/ui.store';
import { useModelStore } from '../../store/model.store';
import { useConnectionStore } from '../../store/connection.store';
import type { Chat } from '../../types';

// ─── Chat Item ────────────────────────────────────────────────────────────────

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}

function ChatItem({ chat, isActive, onSelect, onDelete, onRename, onPin }: ChatItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRenameSubmit = useCallback(() => {
    if (editValue.trim()) {
      onRename(chat.id, editValue.trim());
    }
    setIsEditing(false);
    setMenuOpen(false);
  }, [chat.id, editValue, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditValue(chat.title);
      setIsEditing(false);
    }
  }, [chat.title, handleRenameSubmit]);

  return (
    <div
      className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-accent text-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent'
      }`}
      onClick={() => !isEditing && onSelect(chat.id)}
    >
      {chat.pinned && (
        <Pin className="w-2.5 h-2.5 text-amber-400/70 shrink-0" />
      )}
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />

      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRenameSubmit}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground focus:outline-none border-b border-primary/50"
        />
      ) : (
        <span className="flex-1 min-w-0 text-sm truncate">{chat.title}</span>
      )}

      {/* Hover actions */}
      {!isEditing && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setIsEditing(true); setMenuOpen(false); }}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onPin(chat.id, !chat.pinned)}
            className={`p-1 rounded transition-colors ${
              chat.pinned ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={chat.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(chat.id)}
            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-0.5 ml-auto shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={handleRenameSubmit} className="p-1 rounded text-green-400">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => { setEditValue(chat.title); setIsEditing(false); }} className="p-1 rounded text-muted-foreground">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] text-muted-foreground/50 tracking-wider uppercase">{label}</span>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { chats, createChat, deleteChat, renameChat, pinChat, setActiveChat, activeChatId } = useChatStore();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { activeModelId } = useModelStore();
  const { status } = useConnectionStore();

  const handleNewChat = useCallback(() => {
    setActiveChat(null);
    navigate('/');
  }, [setActiveChat, navigate]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChat(id);
    navigate(`/chat/${id}`);
  }, [navigate, setActiveChat]);

  const handleDelete = useCallback((id: string) => {
    deleteChat(id);
    if (activeChatId === id) {
      navigate('/');
    }
  }, [deleteChat, navigate, activeChatId]);

  // Group chats
  const groupedChats = useMemo(() => {
    const filtered = search
      ? chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
      : chats;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const pinned = filtered.filter(c => c.pinned);
    const todayChats = filtered.filter(
      c => !c.pinned && new Date(c.updatedAt) >= today
    );
    const yesterdayChats = filtered.filter(c => {
      const d = new Date(c.updatedAt);
      return !c.pinned && d >= yesterday && d < today;
    });
    const olderChats = filtered.filter(c => {
      const d = new Date(c.updatedAt);
      return !c.pinned && d < yesterday;
    });

    return { pinned, today: todayChats, yesterday: yesterdayChats, older: olderChats };
  }, [chats, search]);

  return (
    <>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border/50">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm text-foreground">Ollama Chat</span>
                  <div className="flex items-center gap-1">
                    {status === 'checking' && (
                      <>
                        <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                        <span className="text-[10px] text-amber-400">Connecting…</span>
                      </>
                    )}
                    {status === 'connected' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] text-green-400">Ollama connected</span>
                      </>
                    )}
                    {status === 'disconnected' && (
                      <>
                        <WifiOff className="w-2.5 h-2.5 text-destructive/70" />
                        <span className="text-[10px] text-destructive/70">Offline — mock mode</span>
                      </>
                    )}
                    {status === 'idle' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">Running locally</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat button */}
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all text-sm shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search chats…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-sidebar-accent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground/50">No chats yet. Start one!</p>
                </div>
              )}

              {groupedChats.pinned.length > 0 && (
                <>
                  <GroupHeader label="Pinned" />
                  {groupedChats.pinned.map(chat => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelect={handleSelectChat}
                      onDelete={handleDelete}
                      onRename={renameChat}
                      onPin={pinChat}
                    />
                  ))}
                </>
              )}

              {groupedChats.today.length > 0 && (
                <>
                  <GroupHeader label="Today" />
                  {groupedChats.today.map(chat => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelect={handleSelectChat}
                      onDelete={handleDelete}
                      onRename={renameChat}
                      onPin={pinChat}
                    />
                  ))}
                </>
              )}

              {groupedChats.yesterday.length > 0 && (
                <>
                  <GroupHeader label="Yesterday" />
                  {groupedChats.yesterday.map(chat => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelect={handleSelectChat}
                      onDelete={handleDelete}
                      onRename={renameChat}
                      onPin={pinChat}
                    />
                  ))}
                </>
              )}

              {groupedChats.older.length > 0 && (
                <>
                  <GroupHeader label="Older" />
                  {groupedChats.older.map(chat => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelect={handleSelectChat}
                      onDelete={handleDelete}
                      onRename={renameChat}
                      onPin={pinChat}
                    />
                  ))}
                </>
              )}

              {search && Object.values(groupedChats).every(g => g.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground/50">No chats found for "{search}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-sidebar-border/50 px-3 py-3 space-y-1">
              {/* User */}
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs text-white font-medium shrink-0">
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">Local User</p>
                  <p className="text-[10px] text-muted-foreground/50 truncate">ollama@localhost</p>
                </div>
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/settings')}
                  className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all text-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                <button
                  onClick={() => navigate('/models')}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all text-xs"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Models
                </button>
                <button
                  onClick={() => navigate('/compare')}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all text-xs"
                  title="Compare models"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed toggle button */}
      {!sidebarOpen && (
        <div className="flex flex-col items-center py-4 px-2 border-r border-border/50 bg-sidebar shrink-0 gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
            title="Expand sidebar"
          >
            <Bot className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/compare')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
            title="Compare models"
          >
            <GitCompare className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}