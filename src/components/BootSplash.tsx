import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

const SPLASH = require('../../assets/splash/splash.jpg');
const NATIVE_HIDE_FALLBACK_MS = 1500;

function hideNative() {
  SplashScreen.hideAsync().catch(() => undefined);
}

/** Abertura com a foto do app; a tela preta nativa só sai quando a foto já está desenhada. */
export function BootSplash() {
  const { width, height } = useWindowDimensions();
  // Em retrato a foto ocupa a tela toda; na TV/paisagem aparece inteira sobre um fundo desfocado.
  const fit = height >= width ? 'cover' : 'contain';

  useEffect(() => {
    const t = setTimeout(hideNative, NATIVE_HIDE_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      <Image source={SPLASH} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
      <View style={styles.dim} />
      <Image source={SPLASH} style={StyleSheet.absoluteFill} contentFit={fit} onDisplay={hideNative} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
