import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ContentType } from '../api/types';
import { useAccountKey } from './auth';
import { persistStorage } from './storage';

export interface FavoriteItem {
  key: string;
  type: ContentType;
  id: string;
  name: string;
  icon?: string | null;
  categoryId?: string | null;
  extension?: string;
  addedAt: number;
}

export type FavoriteInput = Omit<FavoriteItem, 'key' | 'addedAt'>;

export const favoriteKeyOf = (type: ContentType, id: string | number) => `${type}:${id}`;

interface FavoritesState {
  byAccount: Record<string, Record<string, FavoriteItem>>;
  /** Adiciona ou remove; devolve true se o item ficou favoritado. */
  toggle: (account: string, item: FavoriteInput) => boolean;
  remove: (account: string, key: string) => void;
}

const EMPTY: Record<string, FavoriteItem> = {};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byAccount: {},
      toggle: (account, item) => {
        const key = favoriteKeyOf(item.type, item.id);
        const current = { ...(get().byAccount[account] ?? {}) };
        const added = !current[key];
        if (added) {
          current[key] = { ...item, id: String(item.id), key, addedAt: Date.now() };
        } else {
          delete current[key];
        }
        set({ byAccount: { ...get().byAccount, [account]: current } });
        return added;
      },
      remove: (account, key) => {
        const current = { ...(get().byAccount[account] ?? {}) };
        delete current[key];
        set({ byAccount: { ...get().byAccount, [account]: current } });
      },
    }),
    { name: 'favorites', storage: persistStorage, partialize: (s) => ({ byAccount: s.byAccount }) },
  ),
);

export function useIsFavorite(type: ContentType, id: string | number): boolean {
  const account = useAccountKey();
  return useFavoritesStore((s) => !!s.byAccount[account]?.[favoriteKeyOf(type, id)]);
}

export function useToggleFavorite() {
  const account = useAccountKey();
  const toggle = useFavoritesStore((s) => s.toggle);
  return (item: FavoriteInput) => toggle(account, item);
}

/** Favoritos da conta atual, mais recentes primeiro, opcionalmente filtrados por tipo. */
export function useFavorites(type?: ContentType): FavoriteItem[] {
  const account = useAccountKey();
  const map = useFavoritesStore((s) => s.byAccount[account] ?? EMPTY);
  return useMemo(
    () =>
      Object.values(map)
        .filter((f) => !type || f.type === type)
        .sort((a, b) => b.addedAt - a.addedAt),
    [map, type],
  );
}
