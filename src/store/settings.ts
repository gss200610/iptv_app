import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LiveFormat } from '../api/xtream';
import { persistStorage } from './storage';

export type VideoFit = 'contain' | 'cover' | 'fill';

export const VIDEO_FIT_LABEL: Record<VideoFit, string> = {
  contain: 'Ajustar',
  cover: 'Preencher',
  fill: 'Esticar',
};

const NEXT_FIT: Record<VideoFit, VideoFit> = { contain: 'cover', cover: 'fill', fill: 'contain' };

/** Muitos painéis IPTV recusam streams para User-Agents desconhecidos; VLC é o mais aceito. */
export type PlayerIdentity = 'vlc' | 'smarters' | 'browser' | 'app';

export const PLAYER_IDENTITIES: { id: PlayerIdentity; label: string; userAgent?: string }[] = [
  { id: 'vlc', label: 'VLC', userAgent: 'VLC/3.0.21 LibVLC/3.0.21' },
  { id: 'smarters', label: 'IPTV Smarters', userAgent: 'IPTVSmartersPlayer' },
  {
    id: 'browser',
    label: 'Navegador',
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  },
  { id: 'app', label: 'Padrão do app' },
];

export function userAgentOf(identity: PlayerIdentity): string | undefined {
  return PLAYER_IDENTITIES.find((p) => p.id === identity)?.userAgent;
}

interface SettingsState {
  liveFormat: LiveFormat;
  videoFit: VideoFit;
  playerIdentity: PlayerIdentity;
  setLiveFormat: (format: LiveFormat) => void;
  cycleVideoFit: () => VideoFit;
  setPlayerIdentity: (identity: PlayerIdentity) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      liveFormat: 'm3u8',
      videoFit: 'contain',
      playerIdentity: 'vlc',
      setLiveFormat: (liveFormat) => set({ liveFormat }),
      cycleVideoFit: () => {
        const videoFit = NEXT_FIT[get().videoFit];
        set({ videoFit });
        return videoFit;
      },
      setPlayerIdentity: (playerIdentity) => set({ playerIdentity }),
    }),
    { name: 'settings', storage: persistStorage },
  ),
);
