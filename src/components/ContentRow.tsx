import { FlatList, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';

import { colors, font, isTV, scale, spacing } from '../theme';
import { PosterCard } from './PosterCard';
import type { PosterGridEntry } from './PosterGrid';

interface ContentRowProps<T extends PosterGridEntry> {
  title: string;
  items: T[];
  onPress: (item: T) => void;
  onLongPress?: (item: T) => void;
}

const CARD_WIDTH = isTV ? scale(120) : 104;

/** Linha horizontal de capas (Continuar assistindo, favoritos recentes). */
export function ContentRow<T extends PosterGridEntry>({ title, items, onPress, onLongPress }: ContentRowProps<T>) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <TVFocusGuideView autoFocus>
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PosterCard
              title={item.title}
              subtitle={item.subtitle}
              image={item.image}
              progress={item.progress}
              favorite={item.favorite}
              width={CARD_WIDTH}
              onPress={() => onPress(item)}
              onLongPress={onLongPress ? () => onLongPress(item) : undefined}
            />
          )}
        />
      </TVFocusGuideView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: font.medium,
    fontWeight: '700',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
});
