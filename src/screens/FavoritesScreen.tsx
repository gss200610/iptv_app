import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';

import type { ContentType } from '../api/types';
import { AppButton } from '../components/AppButton';
import { PosterGrid, type PosterGridEntry } from '../components/PosterGrid';
import { EmptyState } from '../components/ScreenState';
import { useOpenContent } from '../navigation/useOpenContent';
import { useFavorites, type FavoriteItem } from '../store/favorites';
import { colors, font, spacing } from '../theme';

const FILTERS: { key: ContentType | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'live', label: 'Canais' },
  { key: 'movie', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
];

const TYPE_LABEL: Record<ContentType, string> = { live: 'Canal', movie: 'Filme', series: 'Série' };

export function FavoritesScreen() {
  const [filter, setFilter] = useState<ContentType | 'all'>('all');
  const favorites = useFavorites(filter === 'all' ? undefined : filter);
  const { openFavorite, toggleWithFeedback } = useOpenContent();

  const entries = useMemo(
    () =>
      favorites.map<PosterGridEntry & { fav: FavoriteItem }>((fav) => ({
        key: fav.key,
        title: fav.name,
        subtitle: TYPE_LABEL[fav.type],
        image: fav.icon,
        favorite: true,
        fav,
      })),
    [favorites],
  );

  const header = (
    <View>
      <TVFocusGuideView autoFocus>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <AppButton
              key={f.key}
              label={f.label}
              compact
              variant={filter === f.key ? 'primary' : 'secondary'}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      </TVFocusGuideView>
      {entries.length > 0 ? (
        <Text style={styles.hint}>Pressione e segure um item para removê-lo dos favoritos.</Text>
      ) : null}
    </View>
  );

  if (entries.length === 0) {
    return (
      <View style={styles.flex}>
        {header}
        <EmptyState message="Nenhum favorito ainda. Pressione e segure um canal, filme ou série para favoritar." />
      </View>
    );
  }

  return (
    <PosterGrid
      items={entries}
      onPress={(e) => openFavorite(e.fav)}
      onLongPress={(e) => toggleWithFeedback(e.fav)}
      ListHeaderComponent={header}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  filters: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: font.small,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
