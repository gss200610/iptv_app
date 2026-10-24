import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';

import { errorMessage, useSeriesInfo } from '../api/queries';
import type { Episode } from '../api/types';
import { flattenEpisodes } from '../api/xtream';
import { AppButton } from '../components/AppButton';
import { DetailLayout } from '../components/DetailLayout';
import { Focusable } from '../components/Focusable';
import { ProgressBar } from '../components/ProgressBar';
import { ErrorState, LoadingState } from '../components/ScreenState';
import type { ScreenProps } from '../navigation/types';
import { episodeToPlayable, nextEpisodeOf } from '../player/episodes';
import { progressKeyOf } from '../player/types';
import { useIsFavorite, useToggleFavorite } from '../store/favorites';
import { resumePositionOf, useAccountProgress, type ProgressEntry } from '../store/progress';
import { colors, font, radius, spacing } from '../theme';
import { formatTime, hasValue } from '../utils/format';

export function SeriesDetailScreen({ route, navigation }: ScreenProps<'SeriesDetail'>) {
  const { seriesId, name, cover, categoryId } = route.params;
  const { data, isLoading, error, refetch } = useSeriesInfo(seriesId);
  const progress = useAccountProgress();
  const favorite = useIsFavorite('series', seriesId);
  const toggleFavorite = useToggleFavorite();

  const episodes = useMemo(() => (data ? flattenEpisodes(data) : []), [data]);
  const seasons = useMemo(() => [...new Set(episodes.map((e) => Number(e.season)))].sort((a, b) => a - b), [episodes]);
  const poster = data?.info.cover || cover;
  const seriesRef = { seriesId, seriesName: name, cover: poster, categoryId };

  // Episódio assistido mais recentemente desta série.
  const lastWatched = useMemo<ProgressEntry | undefined>(
    () =>
      Object.values(progress)
        .filter((p) => p.kind === 'episode' && p.seriesId === seriesId)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0],
    [progress, seriesId],
  );

  const [selectedSeason, setSeason] = useState<number | null>(null);
  const season = selectedSeason ?? lastWatched?.season ?? seasons[0] ?? null;

  const seasonEpisodes = episodes.filter((e) => Number(e.season) === season);

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const playEpisode = (episode: Episode, startAt?: number) =>
    navigation.navigate('Player', { item: episodeToPlayable(episode, seriesRef), startAt });

  let primary: { label: string; onPress: () => void } | null = null;
  const resumeAt = resumePositionOf(lastWatched);
  const lastEpisode = lastWatched && episodes.find((e) => String(e.id) === lastWatched.id);
  if (lastWatched && lastEpisode && resumeAt != null) {
    primary = {
      label: `Continuar T${lastWatched.season} E${lastWatched.episodeNum} de ${formatTime(resumeAt)}`,
      onPress: () => playEpisode(lastEpisode, resumeAt),
    };
  } else if (lastWatched?.finished && lastEpisode) {
    const next = nextEpisodeOf(episodes, String(lastEpisode.id));
    if (next) primary = { label: `Próximo: T${next.season} E${next.episode_num}`, onPress: () => playEpisode(next, 0) };
  }
  if (!primary && episodes[0]) {
    const first = episodes[0];
    primary = { label: `Assistir T${first.season} E${first.episode_num}`, onPress: () => playEpisode(first, 0) };
  }

  const info = data?.info ?? {};
  const year = info.releaseDate?.slice(0, 4);
  const meta = [
    hasValue(year) ? year : undefined,
    hasValue(info.genre) ? info.genre : undefined,
    hasValue(info.rating) ? `★ ${info.rating}` : undefined,
  ].filter((v): v is string => !!v);

  return (
    <DetailLayout
      title={name}
      poster={poster}
      backdrop={info.backdrop_path?.[0]}
      meta={meta}
      plot={info.plot}
      actions={
        <>
          {primary ? <AppButton label={primary.label} icon="▶" onPress={primary.onPress} hasTVPreferredFocus /> : null}
          <AppButton
            label={favorite ? 'Favorito' : 'Favoritar'}
            icon={favorite ? '★' : '☆'}
            variant="secondary"
            onPress={() => toggleFavorite({ type: 'series', id: seriesId, name, icon: poster, categoryId })}
          />
        </>
      }
    >
      {seasons.length > 0 ? (
        <TVFocusGuideView autoFocus>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasons}>
            {seasons.map((s) => (
              <AppButton
                key={s}
                label={`Temporada ${s}`}
                compact
                variant={s === season ? 'primary' : 'secondary'}
                onPress={() => setSeason(s)}
              />
            ))}
          </ScrollView>
        </TVFocusGuideView>
      ) : (
        <Text style={styles.empty}>Nenhum episódio disponível.</Text>
      )}

      <TVFocusGuideView autoFocus style={styles.episodes}>
        {seasonEpisodes.map((episode) => {
          const entry = progress[progressKeyOf({ kind: 'episode', id: String(episode.id) })];
          const ratio = entry && entry.duration > 0 ? entry.position / entry.duration : 0;
          const rawDuration = episode.info && !Array.isArray(episode.info) ? episode.info.duration : undefined;
          const duration = hasValue(rawDuration) ? rawDuration : '';
          return (
            <Focusable
              key={episode.id}
              // Sem startAt o player pergunta se deve continuar de onde parou.
              onPress={() => playEpisode(episode)}
              accessibilityRole="button"
              accessibilityLabel={`Episódio ${episode.episode_num} ${episode.title}`}
              style={styles.episode}
              focusedStyle={styles.episodeFocused}
            >
              <View style={styles.episodeRow}>
                <Text style={styles.episodeNum}>{episode.episode_num}</Text>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {episode.title}
                  </Text>
                  <Text style={styles.episodeMeta}>
                    {[duration, entry?.finished ? 'Assistido' : null].filter(Boolean).join('  •  ')}
                  </Text>
                  {ratio > 0 && !entry?.finished ? <ProgressBar ratio={ratio} /> : null}
                </View>
                {entry?.finished ? <Text style={styles.check}>✓</Text> : null}
              </View>
            </Focusable>
          );
        })}
      </TVFocusGuideView>
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  seasons: {
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: font.body,
  },
  episodes: {
    gap: spacing.xs,
  },
  episode: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  episodeFocused: {
    backgroundColor: colors.surfaceAlt,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  episodeNum: {
    color: colors.textMuted,
    fontSize: font.large,
    fontWeight: '700',
    minWidth: font.large * 1.6,
    textAlign: 'center',
  },
  episodeInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  episodeTitle: {
    color: colors.text,
    fontSize: font.medium,
  },
  episodeMeta: {
    color: colors.textMuted,
    fontSize: font.small,
  },
  check: {
    color: colors.primary,
    fontSize: font.large,
    fontWeight: '700',
  },
});
