import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';
import { AppButton } from './AppButton';

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Algo deu errado</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <AppButton label="Tentar novamente" onPress={onRetry} hasTVPreferredFocus /> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  text: {
    color: colors.textMuted,
    fontSize: font.body,
    textAlign: 'center',
  },
});
