import { useEvent, useEventListener } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useVideoPlayer, VideoView, type AudioTrack, type SubtitleTrack, type VideoPlayerStatus } from 'expo-video';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useSeriesInfo, useShortEpg, useStreams } from '../api/queries';
import type { ContentType, EpgListing } from '../api/types';
import { decodeBase64Utf8, flattenEpisodes, type LiveFormat } from '../api/xtream';
import { AppButton } from '../components/AppButton';
import { BackButton } from '../components/BackButton';
import { Focusable } from '../components/Focusable';
import { ProgressBar } from '../components/ProgressBar';
import { ResumeDialog } from '../components/ResumeDialog';
import { TrackPicker, type TrackOption } from '../components/TrackPicker';
import type { ScreenProps } from '../navigation/types';
import { episodeToPlayable, nextEpisodeOf } from '../player/episodes';
import { seekPlayer, selectAudioTrack, selectSubtitleTrack } from '../player/controls';
import { describePlaybackError, type PlaybackProblem } from '../player/errors';
import { buildVideoSource } from '../player/source';
import { episodeLabel, progressKeyOf, type PlayableItem } from '../player/types';
import { useAccountKey, useAuth } from '../store/auth';
import { useFavorites, useIsFavorite, useToggleFavorite } from '../store/favorites';
import { getProgress, resumePositionOf, useProgressStore } from '../store/progress';
import { userAgentOf, useSettings, VIDEO_FIT_LABEL } from '../store/settings';
import { colors, font, isTV, radius, spacing } from '../theme';
import { useRemote } from '../tv/useRemote';
import { formatTime } from '../utils/format';

const SEEK_STEP = 10;
const SAVE_INTERVAL = 10;
const OVERLAY_TIMEOUT_MS = 5000;
const NEXT_EPISODE_COUNTDOWN = 10;
const MAX_AUTO_RETRY = 1;
const RETRY_DELAY_MS = 1500;
const LIVE_START_TIMEOUT_MS = 20000;

function initialResumeAsk(item: PlayableItem, startAt: number | undefined, account: string): number | null {
  if (startAt !== undefined || item.kind === 'live') return null;
  return resumePositionOf(getProgress(account, progressKeyOf(item)));
}

function epgLine(listing: EpgListing | undefined): string {
  if (!listing) return '';
  const start = listing.start?.slice(11, 16) ?? '';
  const end = listing.end?.slice(11, 16) ?? '';
  return `${start}${end ? ` - ${end}` : ''}  ${decodeBase64Utf8(listing.title)}`.trim();
}

function trackLabel(track: AudioTrack | SubtitleTrack): string {
  return track.label || track.name || track.language || 'Faixa';
}

function sameTrack(a: AudioTrack | SubtitleTrack | null | undefined, b: AudioTrack | SubtitleTrack): boolean {
  if (!a) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.language === b.language && a.label === b.label;
}

export function PlayerScreen({ route, navigation }: ScreenProps<'Player'>) {
  const { zapSource } = route.params;
  const account = useAccountKey();
  const client = useAuth((s) => s.client);
  const liveFormat = useSettings((s) => s.liveFormat);
  const playerIdentity = useSettings((s) => s.playerIdentity);
  const videoFit = useSettings((s) => s.videoFit);
  const cycleVideoFit = useSettings((s) => s.cycleVideoFit);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const landscape = screenWidth > screenHeight;
  const saveProgress = useProgressStore((s) => s.save);
  const markFinished = useProgressStore((s) => s.markFinished);
  const setLastChannel = useProgressStore((s) => s.setLastChannel);

  const [item, setItem] = useState<PlayableItem>(route.params.item);
  const [askResume, setAskResume] = useState<number | null>(() =>
    initialResumeAsk(route.params.item, route.params.startAt, account),
  );
  const [formatOverride, setFormatOverride] = useState<LiveFormat | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<PlaybackProblem | null>(null);
  const [status, setStatus] = useState<VideoPlayerStatus>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [overlay, setOverlay] = useState(true);
  const [flashText, setFlashText] = useState<string | null>(null);
  const [picker, setPicker] = useState<'audio' | 'subtitle' | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  const itemRef = useRef(item);
  const liveFormatRef = useRef(liveFormat);
  const startRef = useRef(route.params.startAt ?? 0);
  const pendingSeekRef = useRef<number | null>(null);
  const seekWaitRef = useRef(0);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastSavedRef = useRef(0);
  const triedFallbackRef = useRef(false);
  const autoRetryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O ExoPlayer emite "fim" ao preparar uma playlist vazia; só vale depois que a fonte atual carregou.
  const sourceReadyRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 1;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { audioTrack } = useEvent(player, 'audioTrackChange', { audioTrack: player.audioTrack });
  const { subtitleTrack } = useEvent(player, 'subtitleTrackChange', { subtitleTrack: player.subtitleTrack });
  const playingRef = useRef(isPlaying);

  const isLive = item.kind === 'live';

  // --- Lista para troca de canal e próximo episódio ---
  const zapFromCategory = isLive && zapSource !== 'favorites';
  const categoryStreams = useStreams('live', zapFromCategory ? item.categoryId : null, zapFromCategory);
  const liveFavorites = useFavorites('live');
  const zapList = useMemo<PlayableItem[]>(() => {
    if (!isLive) return [];
    if (zapSource === 'favorites') {
      return liveFavorites.map((f) => ({ kind: 'live', id: f.id, name: f.name, icon: f.icon, categoryId: f.categoryId }));
    }
    return (categoryStreams.data ?? []).map((s) => ({
      kind: 'live',
      id: String(s.stream_id),
      name: s.name,
      icon: s.stream_icon,
      categoryId: s.category_id,
    }));
  }, [isLive, zapSource, liveFavorites, categoryStreams.data]);

  const seriesInfo = useSeriesInfo(item.kind === 'episode' ? item.seriesId : undefined);
  const nextEpisode = useMemo<PlayableItem | undefined>(() => {
    if (item.kind !== 'episode' || !seriesInfo.data) return undefined;
    const next = nextEpisodeOf(flattenEpisodes(seriesInfo.data), item.id);
    return next
      ? episodeToPlayable(next, {
          seriesId: item.seriesId ?? '',
          seriesName: item.seriesName ?? '',
          cover: item.icon,
          categoryId: item.categoryId,
        })
      : undefined;
  }, [item, seriesInfo.data]);
  const nextEpisodeRef = useRef(nextEpisode);

  // Os listeners do player e o controle remoto leem os valores mais recentes por estas refs.
  useLayoutEffect(() => {
    itemRef.current = item;
    liveFormatRef.current = liveFormat;
    playingRef.current = isPlaying;
    nextEpisodeRef.current = nextEpisode;
  });

  const epg = useShortEpg(isLive ? item.id : undefined, isLive && overlay);
  const listings = epg.data?.epg_listings ?? [];

  // --- Favorito do item atual (no episódio, favorita a série) ---
  const favType: ContentType = isLive ? 'live' : item.kind === 'movie' ? 'movie' : 'series';
  const favId = item.kind === 'episode' ? item.seriesId ?? item.id : item.id;
  const favorite = useIsFavorite(favType, favId);
  const toggleFavorite = useToggleFavorite();

  // --- Progresso ---
  const persist = useCallback(() => {
    const current = itemRef.current;
    if (current.kind === 'live' || positionRef.current <= 0) return;
    saveProgress(account, current, positionRef.current, durationRef.current);
    lastSavedRef.current = positionRef.current;
  }, [account, saveProgress]);

  useEffect(() => () => persist(), [persist]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        persist();
        player.pause();
      }
    });
    return () => sub.remove();
  }, [persist, player]);

  // --- Overlay ---
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playingRef.current) setOverlay(false);
    }, OVERLAY_TIMEOUT_MS);
  }, []);

  const showOverlay = useCallback(() => {
    setOverlay(true);
    scheduleHide();
  }, [scheduleHide]);

  const flash = useCallback((text: string) => {
    setFlashText(text);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashText(null), 1800);
  }, []);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // --- Falhas: tenta de novo sozinho, no ao vivo troca de formato, e só então mostra o erro ---
  const cancelAutoRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  useEffect(() => cancelAutoRetry, [cancelAutoRetry]);

  const fail = useCallback((raw: string | undefined) => {
    if (retryTimerRef.current) return;
    const current = itemRef.current;
    if (autoRetryRef.current < MAX_AUTO_RETRY) {
      autoRetryRef.current += 1;
      startRef.current = current.kind === 'live' ? 0 : positionRef.current;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setReloadToken((t) => t + 1);
      }, RETRY_DELAY_MS);
      return;
    }
    if (current.kind === 'live' && !triedFallbackRef.current) {
      // Muitos servidores só entregam um dos formatos.
      triedFallbackRef.current = true;
      autoRetryRef.current = 0;
      setFormatOverride((prev) => ((prev ?? liveFormatRef.current) === 'm3u8' ? 'ts' : 'm3u8'));
      return;
    }
    setError(describePlaybackError(raw));
  }, []);

  // --- Carregamento da fonte ---
  useEffect(() => {
    if (!client || askResume != null) return;
    const source = buildVideoSource(client, item, formatOverride ?? liveFormat, userAgentOf(playerIdentity));
    const start = startRef.current;
    pendingSeekRef.current = start > 0 ? start : null;
    seekWaitRef.current = 0;
    sourceReadyRef.current = false;
    positionRef.current = start;
    lastSavedRef.current = start;
    setPosition(start);
    setError(null);
    if (item.kind === 'live') setLastChannel(account, item);

    let cancelled = false;
    player
      .replaceAsync(source)
      .then(() => {
        if (!cancelled) player.play();
      })
      .catch((e: unknown) => {
        if (!cancelled) fail(e instanceof Error ? e.message : undefined);
      });
    showOverlay();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, item, askResume, formatOverride, liveFormat, playerIdentity, reloadToken]);

  // Canal ao vivo travado carregando conta como falha (o ExoPlayer pode ficar esperando indefinidamente).
  useEffect(() => {
    if (!isLive || status !== 'loading' || error) return;
    const t = setTimeout(() => fail('Timeout: o canal não começou a transmitir'), LIVE_START_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLive, status, error, fail, reloadToken, formatOverride]);

  useEventListener(player, 'sourceLoad', (payload) => {
    sourceReadyRef.current = true;
    if (payload.duration > 0 && Number.isFinite(payload.duration)) {
      durationRef.current = payload.duration;
      setDuration(payload.duration);
    }
    setAudioTracks(payload.availableAudioTracks ?? []);
    setSubtitleTracks(payload.availableSubtitleTracks ?? []);
    if (pendingSeekRef.current != null) seekPlayer(player, pendingSeekRef.current);
  });

  useEventListener(player, 'availableAudioTracksChange', (payload) => setAudioTracks(payload.availableAudioTracks ?? []));
  useEventListener(player, 'availableSubtitleTracksChange', (payload) =>
    setSubtitleTracks(payload.availableSubtitleTracks ?? []),
  );

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const target = pendingSeekRef.current;
    if (target != null) {
      // Ignora o tempo até a busca inicial terminar, para não gravar 0 por cima do progresso salvo.
      if (Math.abs(currentTime - target) > 5 && seekWaitRef.current < 15) {
        seekWaitRef.current += 1;
        if (seekWaitRef.current === 3) seekPlayer(player, target);
        return;
      }
      pendingSeekRef.current = null;
    }
    positionRef.current = currentTime;
    if (!durationRef.current) {
      const d = player.duration;
      if (d > 0 && Number.isFinite(d)) {
        durationRef.current = d;
        setDuration(d);
      }
    }
    setPosition(currentTime);
    if (itemRef.current.kind !== 'live' && Math.abs(currentTime - lastSavedRef.current) >= SAVE_INTERVAL) persist();
  });

  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    if (!playing) {
      persist();
      setOverlay(true);
    } else {
      autoRetryRef.current = 0;
      scheduleHide();
    }
  });

  useEventListener(player, 'statusChange', ({ status: next, error: playerError }) => {
    setStatus(next);
    if (next === 'error') fail(playerError?.message);
  });

  useEventListener(player, 'playToEnd', () => {
    const current = itemRef.current;
    if (current.kind === 'live' || !sourceReadyRef.current) return;
    if (durationRef.current <= 0 && positionRef.current < 1) {
      setError({ message: 'O servidor encerrou a transmissão sem enviar o vídeo.', detail: '' });
      return;
    }
    const total = durationRef.current || positionRef.current;
    markFinished(account, current, total);
    positionRef.current = total;
    lastSavedRef.current = total;
    if (current.kind === 'episode' && nextEpisodeRef.current) {
      setNextCountdown(NEXT_EPISODE_COUNTDOWN);
    } else {
      navigation.goBack();
    }
  });

  // --- Troca de item (canal, próximo episódio) ---
  const openItem = useCallback(
    (next: PlayableItem, startAt?: number) => {
      persist();
      player.pause();
      cancelAutoRetry();
      autoRetryRef.current = 0;
      triedFallbackRef.current = false;
      startRef.current = startAt ?? 0;
      positionRef.current = 0;
      durationRef.current = 0;
      lastSavedRef.current = 0;
      pendingSeekRef.current = null;
      setDuration(0);
      setFormatOverride(null);
      setError(null);
      setNextCountdown(null);
      setAudioTracks([]);
      setSubtitleTracks([]);
      setAskResume(initialResumeAsk(next, startAt, account));
      setItem(next);
    },
    [persist, player, account, cancelAutoRetry],
  );

  const playNext = useCallback(() => {
    const next = nextEpisodeRef.current;
    if (next) openItem(next);
  }, [openItem]);

  useEffect(() => {
    if (nextCountdown == null) return;
    if (nextCountdown <= 0) {
      playNext();
      return;
    }
    const t = setTimeout(() => setNextCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [nextCountdown, playNext]);

  const zap = useCallback(
    (delta: number) => {
      if (zapList.length < 2) return;
      const index = zapList.findIndex((c) => c.id === itemRef.current.id);
      const next = zapList[(index + delta + zapList.length) % zapList.length]!;
      openItem(next, 0);
      flash(next.name);
    },
    [zapList, openItem, flash],
  );

  // --- Controles ---
  const togglePlay = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (itemRef.current.kind === 'live') return;
      const max = durationRef.current || Number.MAX_SAFE_INTEGER;
      const target = Math.max(0, Math.min(max - 1, seconds));
      pendingSeekRef.current = null;
      seekPlayer(player, target);
      positionRef.current = target;
      setPosition(target);
      flash(`${formatTime(target)} / ${formatTime(durationRef.current)}`);
    },
    [player, flash],
  );

  const seekBy = useCallback((delta: number) => seekTo(positionRef.current + delta), [seekTo]);

  // --- Tela cheia no celular: trava em paisagem; ao sair trava em retrato até fechar o player ---
  useEffect(() => {
    if (isTV) return;
    return () => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, []);

  const setFullscreen = useCallback((on: boolean) => {
    ScreenOrientation.lockAsync(
      on ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => undefined);
  }, []);

  const retry = () => {
    cancelAutoRetry();
    autoRetryRef.current = 0;
    triedFallbackRef.current = false;
    startRef.current = itemRef.current.kind === 'live' ? 0 : positionRef.current;
    setError(null);
    setReloadToken((t) => t + 1);
  };

  const dialogOpen = askResume != null || picker != null || nextCountdown != null || error != null;

  useRemote((key) => {
    if (dialogOpen) return;
    if (key === 'playPause' || key === 'play' || key === 'pause') {
      togglePlay();
      showOverlay();
      return;
    }
    if (key === 'rewind') return seekBy(-SEEK_STEP * 3);
    if (key === 'fastForward') return seekBy(SEEK_STEP * 3);
    if (overlay) {
      scheduleHide();
      return;
    }
    switch (key) {
      case 'left':
        if (isLive) showOverlay();
        else seekBy(-SEEK_STEP);
        break;
      case 'right':
        if (isLive) showOverlay();
        else seekBy(SEEK_STEP);
        break;
      case 'up':
        if (isLive) zap(-1);
        else showOverlay();
        break;
      case 'down':
        if (isLive) zap(1);
        else showOverlay();
        break;
    }
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (picker) {
        setPicker(null);
        return true;
      }
      if (isTV && overlay && !dialogOpen) {
        setOverlay(false);
        return true;
      }
      if (!isTV && landscape) {
        setFullscreen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [picker, overlay, dialogOpen, landscape, setFullscreen]);

  // --- Faixas ---
  const audioOptions: TrackOption[] = audioTracks.map((track, i) => ({
    key: track.id ?? `a${i}`,
    label: trackLabel(track),
    selected: sameTrack(audioTrack, track),
    onSelect: () => selectAudioTrack(player, track),
  }));
  const subtitleOptions: TrackOption[] = [
    {
      key: 'off',
      label: 'Desativadas',
      selected: !subtitleTrack,
      onSelect: () => selectSubtitleTrack(player, null),
    },
    ...subtitleTracks.map((track, i) => ({
      key: track.id ?? `s${i}`,
      label: trackLabel(track),
      selected: sameTrack(subtitleTrack, track),
      onSelect: () => selectSubtitleTrack(player, track),
    })),
  ];

  const title = item.kind === 'episode' ? item.seriesName ?? item.name : item.name;
  const subtitle =
    item.kind === 'episode'
      ? `${episodeLabel(item)}  ${item.name}`.trim()
      : isLive
        ? epgLine(listings[0])
        : '';

  return (
    <View style={styles.root}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit={videoFit} />

      {!overlay && !dialogOpen ? (
        <Focusable
          style={styles.surface}
          focusedStyle={styles.surface}
          hasTVPreferredFocus
          accessibilityLabel="Mostrar controles"
          onPress={showOverlay}
        >
          <View />
        </Focusable>
      ) : null}

      {status === 'loading' && !error ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : null}

      {flashText && !overlay ? (
        <View style={styles.flash} pointerEvents="none">
          <Text style={styles.flashText} numberOfLines={1}>
            {flashText}
          </Text>
          {!isLive && duration > 0 ? <ProgressBar ratio={position / duration} style={styles.flashBar} /> : null}
        </View>
      ) : null}

      {overlay && !dialogOpen ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} focusable={false} onPress={() => setOverlay(false)} />

          <View style={styles.topBar}>
            {!isTV ? <BackButton onPress={() => navigation.goBack()} /> : null}
            <View style={styles.titles}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              {isLive && listings[1] ? (
                <Text style={styles.subtitleMuted} numberOfLines={1}>
                  A seguir: {epgLine(listings[1])}
                </Text>
              ) : null}
            </View>
            {!isTV ? (
              <AppButton
                label={landscape ? 'Sair da tela cheia' : 'Tela cheia'}
                icon={landscape ? '⤡' : '⤢'}
                variant="secondary"
                compact
                onPress={() => {
                  setFullscreen(!landscape);
                  scheduleHide();
                }}
              />
            ) : null}
          </View>

          <View style={styles.centerControls}>
            {isLive && zapList.length > 1 ? (
              <AppButton label="Canal anterior" icon="▲" iconOnly={!isTV} variant="secondary" compact onPress={() => zap(-1)} />
            ) : null}
            {!isLive ? <AppButton label={`-${SEEK_STEP}s`} variant="secondary" compact onPress={() => seekBy(-SEEK_STEP)} /> : null}
            <AppButton
              label={isPlaying ? 'Pausar' : 'Reproduzir'}
              icon={isPlaying ? '❚❚' : '▶'}
              onPress={() => {
                togglePlay();
                scheduleHide();
              }}
              hasTVPreferredFocus
            />
            {!isLive ? <AppButton label={`+${SEEK_STEP}s`} variant="secondary" compact onPress={() => seekBy(SEEK_STEP)} /> : null}
            {isLive && zapList.length > 1 ? (
              <AppButton label="Próximo canal" icon="▼" iconOnly={!isTV} variant="secondary" compact onPress={() => zap(1)} />
            ) : null}
          </View>

          <View style={styles.bottomBar}>
            {!isLive ? (
              <View style={styles.timeline}>
                <Text style={styles.time}>{formatTime(position)}</Text>
                <Pressable
                  style={styles.barTouch}
                  focusable={false}
                  onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                  onPress={(e) => {
                    if (duration > 0 && barWidth > 0) seekTo((e.nativeEvent.locationX / barWidth) * duration);
                  }}
                >
                  <ProgressBar ratio={duration > 0 ? position / duration : 0} style={styles.bar} />
                </Pressable>
                <Text style={styles.time}>{formatTime(duration)}</Text>
              </View>
            ) : (
              <Text style={styles.liveBadge}>● AO VIVO</Text>
            )}
            <View style={styles.actions}>
              <AppButton
                label={`Tela: ${VIDEO_FIT_LABEL[videoFit]}`}
                variant="secondary"
                compact
                onPress={() => {
                  cycleVideoFit();
                  scheduleHide();
                }}
              />
              {audioTracks.length > 1 ? (
                <AppButton label="Áudio" variant="secondary" compact onPress={() => setPicker('audio')} />
              ) : null}
              {subtitleTracks.length > 0 ? (
                <AppButton label="Legendas" variant="secondary" compact onPress={() => setPicker('subtitle')} />
              ) : null}
              <AppButton
                label={favorite ? 'Favorito' : 'Favoritar'}
                icon={favorite ? '★' : '☆'}
                variant="secondary"
                compact
                onPress={() =>
                  toggleFavorite({
                    type: favType,
                    id: favId,
                    name: item.kind === 'episode' ? item.seriesName ?? item.name : item.name,
                    icon: item.icon,
                    categoryId: item.categoryId,
                    extension: item.kind === 'movie' ? item.extension : undefined,
                  })
                }
              />
              {nextEpisode ? (
                <AppButton label="Próximo episódio" icon="⏭" variant="secondary" compact onPress={playNext} />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {askResume != null ? (
        <ResumeDialog
          title={title}
          position={askResume}
          onResume={() => {
            startRef.current = askResume;
            setAskResume(null);
          }}
          onRestart={() => {
            startRef.current = 0;
            setAskResume(null);
          }}
        />
      ) : null}

      {nextCountdown != null && nextEpisode ? (
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Próximo episódio em {nextCountdown}s</Text>
            <Text style={styles.dialogText} numberOfLines={2}>
              {`${episodeLabel(nextEpisode)}  ${nextEpisode.name}`.trim()}
            </Text>
            <View style={styles.dialogActions}>
              <AppButton label="Assistir agora" icon="▶" onPress={playNext} hasTVPreferredFocus />
              <AppButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Não foi possível reproduzir</Text>
            <Text style={styles.dialogText}>{error.message}</Text>
            {isLive ? (
              <Text style={styles.dialogHint}>
                O app já tentou os dois formatos (HLS e MPEG-TS). O canal pode estar fora do ar.
              </Text>
            ) : null}
            {error.detail ? (
              <Text style={styles.dialogHint} numberOfLines={4}>
                Detalhe técnico: {error.detail}
              </Text>
            ) : null}
            <View style={styles.dialogActions}>
              <AppButton label="Tentar novamente" onPress={retry} hasTVPreferredFocus />
              <AppButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
          </View>
        </View>
      ) : null}

      {picker ? (
        <TrackPicker
          title={picker === 'audio' ? 'Áudio' : 'Legendas'}
          options={picker === 'audio' ? audioOptions : subtitleOptions}
          onClose={() => {
            setPicker(null);
            showOverlay();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  surface: {
    ...StyleSheet.absoluteFill,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
    gap: spacing.sm,
  },
  flashText: {
    color: colors.text,
    fontSize: font.medium,
    fontWeight: '600',
  },
  flashBar: {
    height: 6,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.text,
    fontSize: font.body,
  },
  subtitleMuted: {
    color: colors.textMuted,
    fontSize: font.small,
  },
  centerControls: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    pointerEvents: 'box-none',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  time: {
    color: colors.text,
    fontSize: font.small,
    minWidth: font.small * 4,
    textAlign: 'center',
  },
  barTouch: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  liveBadge: {
    color: colors.danger,
    fontSize: font.small,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  dialogText: {
    color: colors.text,
    fontSize: font.body,
  },
  dialogHint: {
    color: colors.textMuted,
    fontSize: font.small,
  },
  dialogActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
