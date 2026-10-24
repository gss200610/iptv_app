import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, scale, spacing } from '../theme';
import { Artwork } from './Artwork';
import { Focusable } from './Focusable';

interface ChannelRowProps {
  number?: number;
  name: string;
  icon?: string | null;
  favorite?: boolean;
  active?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  hasTVPreferredFocus?: boolean;
}

export const CHANNEL_ROW_HEIGHT = scale(64);

export const ChannelRow = memo(function ChannelRow({
  number,
  name,
  icon,
  favorite,
  active,
  onPress,
  onLongPress,
  hasTVPreferredFocus,
}: ChannelRowProps) {
  return (
    <Focusable
      onPress={onPress}
      onLongPress={onLongPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[styles.row, active && styles.active]}
      focusedStyle={styles.focused}
    >
      <View style={styles.inner}>
        {number != null ? <Text style={styles.number}>{number}</Text> : null}
        <Artwork uri={icon} name={name} contentFit="contain" style={styles.logo} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {favorite ? <Text style={styles.star}>★</Text> : null}
      </View>
    </Focusable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: CHANNEL_ROW_HEIGHT,
    marginHorizontal: spacing.md,
    marginVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.primaryDark,
  },
  focused: {
    backgroundColor: colors.surfaceAlt,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  number: {
    color: colors.textMuted,
    fontSize: font.small,
    width: scale(36),
    textAlign: 'right',
  },
  logo: {
    width: scale(64),
    height: scale(44),
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: font.medium,
  },
  star: {
    color: colors.star,
    fontSize: font.large,
  },
});
