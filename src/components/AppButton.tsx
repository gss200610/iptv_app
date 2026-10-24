import { forwardRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import { Focusable } from './Focusable';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Mostra só o ícone; o texto continua como rótulo de acessibilidade. */
  iconOnly?: boolean;
}

export const AppButton = forwardRef<View, AppButtonProps>(function AppButton(
  { label, onPress, variant = 'primary', icon, loading, disabled, hasTVPreferredFocus, style, compact, iconOnly },
  ref,
) {
  return (
    <Focusable
      ref={ref}
      onPress={onPress}
      disabled={disabled || loading}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, compact && styles.compact, variantStyles[variant], disabled && styles.disabled, style]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            {iconOnly && icon ? null : (
              <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
                {label}
              </Text>
            )}
          </>
        )}
      </View>
    </Focusable>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    color: colors.text,
    fontSize: font.medium,
  },
  label: {
    color: colors.text,
    fontSize: font.medium,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: font.body,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceAlt },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
});
