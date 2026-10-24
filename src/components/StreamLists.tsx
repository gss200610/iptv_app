import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { LiveStream, SeriesItem, VodStream } from '../api/types';
import { useOpenContent } from '../navigation/useOpenContent';
import { progressKeyOf } from '../player/types';
import { useAccountKey } from '../store/auth';
import { favoriteKeyOf, useFavoritesStore } from '../store/favorites';
import { useAccountProgress } from '../store/progress';
import { isTV, spacing } from '../theme';
import { ChannelRow } from './ChannelRow';
import { PosterGrid, type PosterGridEntry } from './PosterGrid';
import { EmptyState } from './ScreenState';

interface ListProps {
  header?: React.ReactElement | null;
  emptyMessage: string;
}

export function ChannelList({ channels, header, emptyMessage }: ListProps & { channels: LiveStream[] }) {
  const account = useAccountKey();
  const favorites = useFavoritesStore((s) => s.byAccount[account]);
  const { navigation, toggleWithFeedback } = useOpenContent();

  return (
    <FlatList
      data={channels}
      keyExtractor={(item) => String(item.stream_id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState message={emptyMessage} />}
      initialNumToRender={15}
      windowSize={9}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => {
        const id = String(item.stream_id);
        return (
          <ChannelRow
            number={item.num}
            name={item.name}
            icon={item.stream_icon}
            favorite={!!favorites?.[favoriteKeyOf('live', id)]}
            hasTVPreferredFocus={isTV && index === 0}
            onPress={() =>
              navigation.navigate('Player', {
                item: { kind: 'live', id, name: item.name, icon: item.stream_icon, categoryId: item.category_id },
                zapSource: 'category',
              })
            }
            onLongPress={() =>
              toggleWithFeedback({ type: 'live', id, name: item.name, icon: item.stream_icon, categoryId: item.category_id })
            }
          />
        );
      }}
    />
  );
}

type VodEntry = PosterGridEntry & { id: string; raw: VodStream | SeriesItem };

export function VodGrid({
  type,
  items,
  header,
  emptyMessage,
  focusFirst = true,
}: ListProps & {
  type: 'movie' | 'series';
  items: (VodStream | SeriesItem)[];
  focusFirst?: boolean;
}) {
  const account = useAccountKey();
  const favorites = useFavoritesStore((s) => s.byAccount[account]);
  const progress = useAccountProgress();
  const { navigation, toggleWithFeedback } = useOpenContent();

  const entries = useMemo<VodEntry[]>(
    () =>
      items.map((raw) => {
        if (type === 'movie') {
          const movie = raw as VodStream;
          const id = String(movie.stream_id);
          const p = progress[progressKeyOf({ kind: 'movie', id })];
          return {
            key: id,
            id,
            raw,
            title: movie.name,
            image: movie.stream_icon,
            favorite: !!favorites?.[favoriteKeyOf('movie', id)],
            progress: p && !p.finished && p.duration > 0 ? p.position / p.duration : undefined,
          };
        }
        const series = raw as SeriesItem;
        const id = String(series.series_id);
        return {
          key: id,
          id,
          raw,
          title: series.name,
          image: series.cover,
          favorite: !!favorites?.[favoriteKeyOf('series', id)],
        };
      }),
    [items, type, favorites, progress],
  );

  const onPress = useCallback(
    (entry: VodEntry) => {
      if (type === 'movie') {
        const movie = entry.raw as VodStream;
        navigation.navigate('MovieDetail', {
          streamId: entry.id,
          name: movie.name,
          icon: movie.stream_icon,
          extension: movie.container_extension,
          categoryId: movie.category_id,
        });
      } else {
        const series = entry.raw as SeriesItem;
        navigation.navigate('SeriesDetail', {
          seriesId: entry.id,
          name: series.name,
          cover: series.cover,
          categoryId: series.category_id,
        });
      }
    },
    [navigation, type],
  );

  const onLongPress = useCallback(
    (entry: VodEntry) => {
      const movie = type === 'movie' ? (entry.raw as VodStream) : undefined;
      toggleWithFeedback({
        type,
        id: entry.id,
        name: entry.title,
        icon: entry.image,
        categoryId: entry.raw.category_id,
        extension: movie?.container_extension,
      });
    },
    [toggleWithFeedback, type],
  );

  if (entries.length === 0) {
    return (
      <View style={styles.flex}>
        {header}
        <EmptyState message={emptyMessage} />
      </View>
    );
  }

  return (
    <PosterGrid
      items={entries}
      onPress={onPress}
      onLongPress={onLongPress}
      ListHeaderComponent={header}
      focusFirst={focusFirst}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});
