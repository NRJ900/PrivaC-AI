import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, Theme, Density, RightPanelTab } from '../types';

interface UIStore extends UIState {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: RightPanelTab) => void;

  setCommandBarOpen: (open: boolean) => void;
  toggleCommandBar: () => void;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setDensity: (density: Density) => void;

  setAutoScroll: (enabled: boolean) => void;
  toggleAutoScroll: () => void;
  setShowLineNumbers: (show: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;

  // Canvas
  openCanvas: (code: string, language: string) => void;
  closeCanvas: () => void;
  toggleCanvas: () => void;

  // Keyboard shortcuts modal
  setShortcutsOpen: (open: boolean) => void;
  toggleShortcuts: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      rightPanelOpen: false,
      rightPanelTab: 'sources',
      commandBarOpen: false,
      theme: 'dark',
      density: 'comfortable',
      autoScroll: true,
      showLineNumbers: true,
      animationsEnabled: true,
      canvasOpen: false,
      canvasCode: '',
      canvasLanguage: 'html',
      shortcutsOpen: false,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),

      setCommandBarOpen: (open) => set({ commandBarOpen: open }),
      toggleCommandBar: () => set(s => ({ commandBarOpen: !s.commandBarOpen })),

      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },

      setDensity: (density) => set({ density }),
      setAutoScroll: (autoScroll) => set({ autoScroll }),
      toggleAutoScroll: () => set(s => ({ autoScroll: !s.autoScroll })),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),

      openCanvas: (code, language) => set({ canvasOpen: true, canvasCode: code, canvasLanguage: language }),
      closeCanvas: () => set({ canvasOpen: false }),
      toggleCanvas: () => set(s => ({ canvasOpen: !s.canvasOpen })),

      setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
      toggleShortcuts: () => set(s => ({ shortcutsOpen: !s.shortcutsOpen })),
    }),
    {
      name: 'ollama-ui-store',
      // Persist user preferences only; runtime panel states reset each session
      partialize: (state) => ({
        theme: state.theme,
        density: state.density,
        autoScroll: state.autoScroll,
        showLineNumbers: state.showLineNumbers,
        animationsEnabled: state.animationsEnabled,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
