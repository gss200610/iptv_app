import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, isTV, radius, scale, spacing } from '../theme';
import { Artwork } from './Artwork';
import { ScreenHeader } from './ScreenHeader';

interface DetailLayoutProps {
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  meta?: string[];
  plot?: string;
  actions: ReactNode;
  children?: ReactNode;
}

/** Estrutura comum das telas de detalhe: capa, metadados, sinopse, ações e conteúdo extra. */
export function DetailLayout({ title, poster, backdrop, meta, plot, actions, children }: DetailLayoutProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const posterWidth = isTV ? scale(180) : landscape ? 150 : 120;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {backdrop ? (
        <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" blurRadius={isTV ? 0 : 2} />
      ) : null}
      <View style={styles.backdropShade} />
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Artwork uri={poster} name={title} style={[styles.poster, { width: posterWidth, height: posterWidth * 1.5 }]} />
          <View style={styles.info}>
            {meta && meta.length > 0 ? <Text style={styles.meta}>{meta.filter(Boolean).join('  •  ')}</Text> : null}
            {plot ? (
              <Text style={styles.plot} numberOfLines={isTV ? 6 : 8}>
                {plot}
              </Text>
            ) : null}
            <View style={styles.actions}>{actions}</View>
          </View>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  backdropShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,15,23,0.55)',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  poster: {
    borderRadius: radius.md,
  },
  info: {
    flex: 1,
    minWidth: 220,
    gap: spacing.md,
  },
  meta: {
    color: colors.textMuted,
    fontSize: font.body,
  },
  plot: {
    color: colors.text,
    fontSize: font.body,
    lineHeight: font.body * 1.45,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
