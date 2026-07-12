import { create } from 'zustand';

interface UIState {
  paletteOpen: boolean;
  scannerOpen: boolean;
  setPalette: (v: boolean) => void;
  setScanner: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  paletteOpen: false,
  scannerOpen: false,
  setPalette: (v) => set({ paletteOpen: v }),
  setScanner: (v) => set({ scannerOpen: v }),
}));
