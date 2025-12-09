import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DisplayMode = 'grid' | 'list';

type UiStore = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  isActivityOpen: boolean;
  setIsActivityOpen: (isOpen: boolean) => void;
  isMyItemsOpen: boolean;
  setIsMyItemsOpen: (isOpen: boolean) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      isMobileSidebarOpen: false,
      setIsMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
      isActivityOpen: true,
      setIsActivityOpen: (isOpen) => set({ isActivityOpen: isOpen }),
      isMyItemsOpen: true,
      setIsMyItemsOpen: (isOpen) => set({ isMyItemsOpen: isOpen }),
      displayMode: 'grid',
      setDisplayMode: (mode) => set({ displayMode: mode }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
