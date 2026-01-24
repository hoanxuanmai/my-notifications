import { create } from 'zustand';

interface GlobalState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
