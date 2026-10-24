import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from './src/api/queries';
import { BootSplash } from './src/components/BootSplash';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuth } from './src/store/auth';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const SPLASH_MIN_MS = 2000;

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const status = useAuth((s) => s.status);
  const restore = useAuth((s) => s.restore);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    restore();
    const t = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, [restore]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          {status === 'restoring' || !minElapsed ? <BootSplash /> : <RootNavigator />}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
