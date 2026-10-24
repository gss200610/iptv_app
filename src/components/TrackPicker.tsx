import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import { AppButton } from './AppButton';

export interface TrackOption {
  key: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

interface TrackPickerProps {
  title: string;
  options: TrackOption[];
  onClose: () => void;
}

export function TrackPicker({ title, options, onClose }: TrackPickerProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {options.map((option, index) => (
            <AppButton
              key={option.key}
              label={option.label}
              icon={option.selected ? '✓' : undefined}
              variant={option.selected ? 'primary' : 'secondary'}
              hasTVPreferredFocus={option.selected || (index === 0 && !options.some((o) => o.selected))}
              onPress={() => {
                option.onSelect();
                onClose();
              }}
            />
          ))}
        </ScrollView>
        <AppButton label="Fechar" variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
  },
});
