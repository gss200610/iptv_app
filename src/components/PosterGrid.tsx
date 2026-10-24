import { useCallback } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, type ListRenderItem } from 'react-native';

import { isTV, scale, spacing } from '../theme';
import { PosterCard } from './PosterCard';

export interface PosterGridEntry {
  key: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  progress?: number;
  favorite?: boolean;
}

interface PosterGridProps<T extends PosterGridEntry> {
  items: T[];
  onPress: (item: T) => void;
  onLongPress?: (item: T) => void;
  ListHeaderComponent?: React.ReactElement | null;
  /** Na TV, coloca o foco inicial no primeiro item (telas abertas a partir de uma lista). */
  focusFirst?: boolean;
}

const TARGET_WIDTH = isTV ? scale(130) : 110;

export function usePosterColumns() {
  const { width } = useWindowDimensions();
  const available = width - spacing.md * 2;
  const columns = Math.max(2, Math.floor(available / TARGET_WIDTH));
  return { columns, itemWidth: Math.floor(available / columns) };
}

export function PosterGrid<T extends PosterGridEntry>({
  items,
  onPress,
  onLongPress,
  ListHeaderComponent,
  focusFirst,
}: PosterGridProps<T>) {
  const { columns, itemWidth } = usePosterColumns();

  const renderItem: ListRenderItem<T> = useCallback(
    ({ item, index }) => (
      <PosterCard
        title={item.title}
        subtitle={item.subtitle}
        image={item.image}
        progress={item.progress}
        favorite={item.favorite}
        width={itemWidth}
        onPress={() => onPress(item)}
        onLongPress={onLongPress ? () => onLongPress(item) : undefined}
        hasTVPreferredFocus={isTV && !!focusFirst && index === 0}
      />
    ),
    [itemWidth, onPress, onLongPress, focusFirst],
  );

  return (
    <FlatList
      key={`grid-${columns}`}
      data={items}
      numColumns={columns}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      ListHeaderComponent={ListHeaderComponent}
      initialNumToRender={columns * 4}
      maxToRenderPerBatch={columns * 4}
      windowSize={7}
      removeClippedSubviews={!isTV}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
