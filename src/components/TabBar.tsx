import { ScrollView, StyleSheet, Text, TVFocusGuideView } from 'react-native';

import { colors, font, isTV, radius, spacing } from '../theme';
import { Focusable } from './Focusable';

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

interface TabBarProps<K extends string> {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
}

export function TabBar<K extends string>({ tabs, active, onChange }: TabBarProps<K>) {
  return (
    <TVFocusGuideView autoFocus style={styles.guide}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Focusable
              key={tab.key}
              // Na TV a aba troca ao receber foco, como nos apps de streaming.
              onFocus={isTV ? () => onChange(tab.key) : undefined}
              onPress={() => onChange(tab.key)}
              hasTVPreferredFocus={isTV && selected}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
            </Focusable>
          );
        })}
      </ScrollView>
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  guide: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.medium,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.text,
  },
});
