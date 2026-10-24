import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, font } from '../theme';

interface ArtworkProps {
  uri?: string | null;
  name: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}

/** Capa ou logo remoto, com as iniciais do nome quando a imagem não existe ou falha. */
export function Artwork({ uri, name, style, contentFit = 'cover' }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  const valid = !!uri && /^https?:\/\//i.test(uri) && !failed;

  return (
    <View style={[styles.box, style]}>
      {valid ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.initials} numberOfLines={1}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

function initials(name: string): string {
  const words = name.replace(/[^0-9A-Za-zÀ-ÿ ]/g, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.textMuted,
    fontSize: font.large,
    fontWeight: '700',
  },
});
