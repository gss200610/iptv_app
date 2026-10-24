import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, isTV, spacing } from '../theme';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

/** Cabeçalho das telas internas. Na TV o botão Voltar do controle substitui o botão da tela. */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      {!isTV && navigation.canGoBack() ? <BackButton onPress={() => navigation.goBack()} /> : null}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.small,
  },
});
