import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TVFocusGuideView, useWindowDimensions, View } from 'react-native';

import { errorMessage, useAllStreams, useCategories } from '../api/queries';
import type { Category, ContentType, LiveStream, SeriesItem, VodStream } from '../api/types';
import { Focusable } from '../components/Focusable';
import { SearchBox } from '../components/SearchBox';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';
import { ChannelList, VodGrid } from '../components/StreamLists';
import type { RootStackParamList } from '../navigation/types';
import { colors, font, isTV, radius, scale, spacing } from '../theme';
import { filterByName, normalizeSearch } from '../utils/format';
import { useDebouncedValue } from '../utils/useDebouncedValue';

const TILE_WIDTH = isTV ? scale(240) : 160;
const MIN_TITLE_QUERY = 2;
const MAX_TITLE_RESULTS = 300;

const PLACEHOLDER: Record<ContentType, string> = {
  live: 'Buscar canal ou categoria',
  movie: 'Buscar filme ou categoria',
  series: 'Buscar série ou categoria',
};

type AnyStream = LiveStream | VodStream | SeriesItem;

export function CategoriesScreen({ type }: { type: ContentType }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, error, refetch } = useCategories(type);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const titleQuery = normalizeSearch(debouncedQuery);
  const searchingTitles = titleQuery.length >= MIN_TITLE_QUERY;

  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.floor((width - spacing.md * 2) / TILE_WIDTH));

  const categories = useMemo(() => filterByName(data ?? [], query), [data, query]);

  const open = (category: Category) =>
    navigation.navigate('Items', { type, categoryId: category.category_id, categoryName: category.category_name });

  if (isLoading) return <LoadingState message="Carregando categorias..." />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <TVFocusGuideView autoFocus style={styles.flex}>
      <SearchBox value={query} onChangeText={setQuery} placeholder={PLACEHOLDER[type]} />
      {searchingTitles ? (
        <TitleResults type={type} query={titleQuery} categories={categories} onOpenCategory={open} />
      ) : (
        <FlatList
          key={`cat-${columns}`}
          data={categories}
          numColumns={columns}
          keyExtractor={(item) => item.category_id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState message={query ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria disponível.'} />
          }
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Focusable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={item.category_name}
              style={[styles.tile, { flex: 1 / columns }]}
              focusedStyle={styles.tileFocused}
            >
              <Text style={styles.tileText} numberOfLines={2}>
                {item.category_name}
              </Text>
            </Focusable>
          )}
        />
      )}
    </TVFocusGuideView>
  );
}

function TitleResults({
  type,
  query,
  categories,
  onOpenCategory,
}: {
  type: ContentType;
  query: string;
  categories: Category[];
  onOpenCategory: (category: Category) => void;
}) {
  const all = useAllStreams(type, true);

  // Normaliza os nomes uma vez por catálogo; a busca a cada tecla só compara strings.
  const index = useMemo(
    () => ((all.data ?? []) as AnyStream[]).map((item) => ({ item, name: normalizeSearch(item.name ?? '') })),
    [all.data],
  );
  const matches = useMemo(() => index.filter((e) => e.name.includes(query)).map((e) => e.item), [index, query]);
  const shown = matches.length > MAX_TITLE_RESULTS ? matches.slice(0, MAX_TITLE_RESULTS) : matches;

  const header = (
    <View>
      {categories.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Categorias ({categories.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            {categories.map((category) => (
              <Focusable
                key={category.category_id}
                onPress={() => onOpenCategory(category)}
                accessibilityRole="button"
                accessibilityLabel={category.category_name}
                style={styles.chip}
                focusedStyle={styles.tileFocused}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {category.category_name}
                </Text>
              </Focusable>
            ))}
          </ScrollView>
        </>
      ) : null}
      {all.data ? (
        <Text style={styles.sectionTitle}>
          {matches.length > shown.length
            ? `Títulos: mostrando ${shown.length} de ${matches.length}, refine a busca`
            : `Títulos (${matches.length})`}
        </Text>
      ) : null}
    </View>
  );

  if (all.isLoading) {
    return (
      <View style={styles.flex}>
        {header}
        <LoadingState message="Buscando em todas as categorias..." />
      </View>
    );
  }
  if (all.error) {
    return (
      <View style={styles.flex}>
        {header}
        <ErrorState message={errorMessage(all.error)} onRetry={() => all.refetch()} />
      </View>
    );
  }

  const emptyMessage = 'Nenhum título encontrado.';
  if (type === 'live') {
    return <ChannelList channels={shown as LiveStream[]} header={header} emptyMessage={emptyMessage} />;
  }
  return (
    <VodGrid
      type={type}
      items={shown as (VodStream | SeriesItem)[]}
      header={header}
      emptyMessage={emptyMessage}
      focusFirst={false}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  tile: {
    minHeight: scale(72),
    margin: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  tileFocused: {
    backgroundColor: colors.surfaceAlt,
  },
  tileText: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chips: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    maxWidth: scale(260),
  },
  chipText: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
  },
});
