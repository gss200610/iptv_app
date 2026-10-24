import { StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme';
import { Focusable } from './Focusable';

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Focusable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={12}
      style={styles.button}
    >
      <Text style={styles.icon}>‹</Text>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  icon: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '300',
  },
});
