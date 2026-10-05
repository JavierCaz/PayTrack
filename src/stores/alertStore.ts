import { create } from 'zustand';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertState {
  queue: AlertRequest[];
  push: (alert: Omit<AlertRequest, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useAlertStore = create<AlertState>((set) => ({
  queue: [],
  push: (alert) => set((s) => ({ queue: [...s.queue, { ...alert, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),
}));

/**
 * Themed replacement for `Alert.alert` — same signature, usable from components and services.
 * Rendered by `<AlertHost />` in the root layout. Alerts raised while one is visible are queued.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  useAlertStore.getState().push({ title, message, buttons });
}
