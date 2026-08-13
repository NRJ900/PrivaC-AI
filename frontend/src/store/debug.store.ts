import { create } from 'zustand';
import type { DebugEntry, OllamaMessage } from '../types';

function uid() { return crypto.randomUUID(); }

const MAX_ENTRIES = 20;

interface DebugStore {
  entries: DebugEntry[];
  addEntry: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  clearEntries: () => void;
}

export const useDebugStore = create<DebugStore>()((set) => ({
  entries: [],

  addEntry: (data) => {
    const entry: DebugEntry = {
      id: uid(),
      timestamp: new Date(),
      ...data,
    };
    set(s => ({
      entries: [entry, ...s.entries].slice(0, MAX_ENTRIES),
    }));
  },

  clearEntries: () => set({ entries: [] }),
}));
