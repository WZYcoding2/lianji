import { create } from 'zustand';
import type { ReactNode } from 'react';

export interface ActionItem {
  label: string;
  value: string;
  destructive?: boolean;
  icon?: ReactNode;
}

export type DialogReq =
  | {
      id: number;
      kind: 'confirm';
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      alertOnly?: boolean;
      resolve: (v: boolean) => void;
    }
  | {
      id: number;
      kind: 'actions';
      title?: string;
      message?: string;
      actions: ActionItem[];
      resolve: (v: string | null) => void;
    }
  | {
      id: number;
      kind: 'prompt';
      title: string;
      message?: string;
      defaultValue?: string;
      placeholder?: string;
      inputMode?: 'text' | 'decimal' | 'numeric';
      resolve: (v: string | null) => void;
    };

export interface ToastReq {
  id: number;
  text: string;
  tone?: 'default' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface UIStore {
  dialogs: DialogReq[];
  toasts: ToastReq[];
  workoutOpen: boolean;
  /** 放弃训练时的收起动画期间，隐藏底部迷你条 */
  workoutClosing: boolean;
  summaryId: number | null;
  closeDialog: (id: number) => void;
  setWorkoutOpen: (v: boolean) => void;
  setSummaryId: (id: number | null) => void;
}

let nextId = 1;

export const useUI = create<UIStore>()((set) => ({
  dialogs: [],
  toasts: [],
  workoutOpen: false,
  workoutClosing: false,
  summaryId: null,
  closeDialog: (id) => set((s) => ({ dialogs: s.dialogs.filter((d) => d.id !== id) })),
  setWorkoutOpen: (v) => set({ workoutOpen: v }),
  setSummaryId: (id) => set({ summaryId: id }),
}));

type Without<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

function pushDialog(d: Without<DialogReq, 'id'>) {
  useUI.setState((s) => ({ dialogs: [...s.dialogs, { ...d, id: nextId++ } as DialogReq] }));
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => pushDialog({ kind: 'confirm', ...opts, resolve }));
}

export function alertDialog(title: string, message?: string): Promise<boolean> {
  return new Promise((resolve) =>
    pushDialog({ kind: 'confirm', title, message, alertOnly: true, confirmText: '好的', resolve }),
  );
}

export function actionSheet(opts: { title?: string; message?: string; actions: ActionItem[] }): Promise<string | null> {
  return new Promise((resolve) => pushDialog({ kind: 'actions', ...opts, resolve }));
}

export function promptDialog(opts: {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
}): Promise<string | null> {
  return new Promise((resolve) => pushDialog({ kind: 'prompt', ...opts, resolve }));
}

export function toast(text: string, opts: Omit<ToastReq, 'id' | 'text'> = {}) {
  const id = nextId++;
  useUI.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, ...opts }] }));
  setTimeout(() => {
    useUI.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, opts.duration ?? 2200);
}

export function dismissToast(id: number) {
  useUI.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}
