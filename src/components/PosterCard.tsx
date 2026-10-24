import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '../theme';
import { Artwork } from './Artwork';
import { Focusable } from './Focusable';
import { ProgressBar } from './ProgressBar';

interface PosterCardProps {
  title: string;
  subtitle?: string;
  image?: string | null;
  width: number;
  progress?: number;
  favorite?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  hasTVPreferredFocus?: boolean;
}

export const POSTER_RATIO = 1.5;

export const PosterCard = memo(function PosterCard({
  title,
  subtitle,
  image,
  width,
  progress,
  favorite,
  onPress,
  onLongPress,
  hasTVPreferredFocus,
}: PosterCardProps) {
  return (
    <Focusable
      onPress={onPress}
      onLongPress={onLongPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      zoomOnFocus
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.card, { width }]}
    >
      <View>
        <Artwork uri={image} name={title} style={[styles.image, { height: Math.round(width * POSTER_RATIO) }]} />
        {favorite ? <Text style={styles.star}>★</Text> : null}
        {progress != null && progress > 0 ? <ProgressBar ratio={progress} style={styles.progress} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Focusable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: spacing.xs,
  },
  image: {
    width: '100%',
    borderRadius: radius.sm,
  },
  star: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.sm,
    color: colors.star,
    fontSize: font.large,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  progress: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: font.small,
    marginTop: spacing.xs,
    minHeight: font.small * 2.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.small,
  },
});
