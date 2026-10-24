import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import { formatTime } from '../utils/format';
import { AppButton } from './AppButton';

interface ResumeDialogProps {
  title: string;
  position: number;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumeDialog({ title, position, onResume, onRestart }: ResumeDialogProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.text}>Você parou em {formatTime(position)}. Deseja continuar de onde parou?</Text>
        <View style={styles.actions}>
          <AppButton label={`Continuar de ${formatTime(position)}`} icon="▶" onPress={onResume} hasTVPreferredFocus />
          <AppButton label="Começar do início" variant="secondary" onPress={onRestart} />
        </View>
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
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
