import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { progressKeyOf, type PlayableItem } from '../player/types';
import { useAccountKey } from './auth';
import { persistStorage } from './storage';

export const RESUME_MIN_SECONDS = 30;
export const FINISHED_RATIO = 0.95;
const MAX_ENTRIES_PER_ACCOUNT = 300;

export interface ProgressEntry extends PlayableItem {
  key: string;
  position: number;
  duration: number;
  updatedAt: number;
  finished: boolean;
}

interface ProgressState {
  byAccount: Record<string, Record<string, ProgressEntry>>;
  lastChannel: Record<string, PlayableItem>;
  save: (account: string, item: PlayableItem, position: number, duration: number) => void;
  markFinished: (account: string, item: PlayableItem, duration: number) => void;
  remove: (account: string, key: string) => void;
  clear: (account: string) => void;
  setLastChannel: (account: string, item: PlayableItem) => void;
}

const EMPTY: Record<string, ProgressEntry> = {};

function prune(entries: Record<string, ProgressEntry>): Record<string, ProgressEntry> {
  const list = Object.values(entries);
  if (list.length <= MAX_ENTRIES_PER_ACCOUNT) return entries;
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return Object.fromEntries(list.slice(0, MAX_ENTRIES_PER_ACCOUNT).map((e) => [e.key, e]));
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byAccount: {},
      lastChannel: {},

      save: (account, item, position, duration) => {
        if (item.kind === 'live' || !account || !(position >= 0)) return;
        const key = progressKeyOf(item);
        const finished = duration > 0 && position / duration >= FINISHED_RATIO;
        const entry: ProgressEntry = {
          ...item,
          key,
          position: Math.floor(position),
          duration: Math.floor(duration > 0 ? duration : get().byAccount[account]?.[key]?.duration ?? 0),
          updatedAt: Date.now(),
          finished,
        };
        const current = { ...(get().byAccount[account] ?? {}), [key]: entry };
        set({ byAccount: { ...get().byAccount, [account]: prune(current) } });
      },

      markFinished: (account, item, duration) => {
        get().save(account, item, duration, duration);
      },

      remove: (account, key) => {
        const current = { ...(get().byAccount[account] ?? {}) };
        delete current[key];
        set({ byAccount: { ...get().byAccount, [account]: current } });
      },

      clear: (account) => {
        const byAccount = { ...get().byAccount };
        delete byAccount[account];
        set({ byAccount });
      },

      setLastChannel: (account, item) => {
        if (!account) return;
        set({ lastChannel: { ...get().lastChannel, [account]: item } });
      },
    }),
    {
      name: 'progress',
      storage: persistStorage,
      partialize: (s) => ({ byAccount: s.byAccount, lastChannel: s.lastChannel }),
    },
  ),
);

/** Posição para retomar, ou null quando o item deve começar do início. */
export function resumePositionOf(entry: ProgressEntry | undefined): number | null {
  if (!entry || entry.finished || entry.position < RESUME_MIN_SECONDS) return null;
  if (entry.duration > 0 && entry.position >= entry.duration * FINISHED_RATIO) return null;
  return entry.position;
}

export function getProgress(account: string, key: string): ProgressEntry | undefined {
  return useProgressStore.getState().byAccount[account]?.[key];
}

export function useProgressEntry(key: string): ProgressEntry | undefined {
  const account = useAccountKey();
  return useProgressStore((s) => s.byAccount[account]?.[key]);
}

export function useAccountProgress(): Record<string, ProgressEntry> {
  const account = useAccountKey();
  return useProgressStore((s) => s.byAccount[account] ?? EMPTY);
}

export function useContinueWatching(limit = 20): ProgressEntry[] {
  const map = useAccountProgress();
  return useMemo(
    () =>
      Object.values(map)
        .filter((e) => resumePositionOf(e) != null)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit),
    [map, limit],
  );
}

export function useLastChannel(): PlayableItem | undefined {
  const account = useAccountKey();
  return useProgressStore((s) => s.lastChannel[account]);
}
