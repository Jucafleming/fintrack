import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Group } from '@/types';

interface GroupState {
  activeGroup: Group | null;
  setActiveGroup: (group: Group) => void;
  clearGroup: () => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      activeGroup: null,
      setActiveGroup: (group) => set({ activeGroup: group }),
      clearGroup: () => set({ activeGroup: null }),
    }),
    { name: 'fintrack-group' },
  ),
);
