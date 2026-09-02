import { create } from "zustand";

interface AlertState {
  open: boolean;
  message: string;
  title?: string;
  showAlert: (message: string, title?: string) => void;
  closeAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  open: false,
  message: "",
  title: undefined,
  showAlert: (message, title) => set({ open: true, message, title }),
  closeAlert: () => set({ open: false }),
}));
