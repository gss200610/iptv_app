import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ContentType } from '../api/types';
import { AppButton } from '../components/AppButton';
import { ContentRow } from '../components/ContentRow';
import type { PosterGridEntry } from '../components/PosterGrid';
import { TabBar, type TabItem } from '../components/TabBar';
import { useOpenContent } from '../navigation/useOpenContent';
import { episodeLabel } from '../player/types';
import { useAuth } from '../store/auth';
import { useFavorites, type FavoriteItem } from '../store/favorites';
import { useContinueWatching, useLastChannel, type ProgressEntry } from '../store/progress';
import { colors, font, radius, spacing } from '../theme';
import { formatExpiry } from '../utils/format';
import { CategoriesScreen } from './CategoriesScreen';
import { FavoritesScreen } from './FavoritesScreen';
import { SettingsScreen } from './SettingsScreen';

type HomeTab = 'home' | ContentType | 'favorites' | 'settings';

const TABS: TabItem<HomeTab>[] = [
  { key: 'home', label: 'Início' },
  { key: 'live', label: 'Ao Vivo' },
  { key: 'movie', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
  { key: 'favorites', label: 'Favoritos' },
  { key: 'settings', label: 'Conta' },
];

export function HomeScreen() {
  const [tab, setTab] = useState<HomeTab>('home');

  // O Voltar do controle/celular volta para "Início" antes de sair do app.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (tab !== 'home') {
          setTab('home');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [tab]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      <TVFocusGuideView autoFocus style={styles.content}>
        {tab === 'home' ? <HomeOverview onNavigate={setTab} /> : null}
        {tab === 'live' || tab === 'movie' || tab === 'series' ? <CategoriesScreen key={tab} type={tab} /> : null}
        {tab === 'favorites' ? <FavoritesScreen /> : null}
        {tab === 'settings' ? <SettingsScreen /> : null}
      </TVFocusGuideView>
    </SafeAreaView>
  );
}

function HomeOverview({ onNavigate }: { onNavigate: (tab: HomeTab) => void }) {
  const userInfo = useAuth((s) => s.userInfo);
  const lastChannel = useLastChannel();
  const continueWatching = useContinueWatching();
  const favorites = useFavorites();
  const { navigation, openFavorite, resume } = useOpenContent();

  const continueEntries = useMemo(
    () =>
      continueWatching.map<PosterGridEntry & { entry: ProgressEntry }>((entry) => ({
        key: entry.key,
        title: entry.kind === 'episode' ? entry.seriesName ?? entry.name : entry.name,
        subtitle: entry.kind === 'episode' ? `${episodeLabel(entry)} ${entry.name}`.trim() : undefined,
        image: entry.icon,
        progress: entry.duration > 0 ? entry.position / entry.duration : undefined,
        entry,
      })),
    [continueWatching],
  );

  const favoriteEntries = useMemo(
    () =>
      favorites.slice(0, 20).map<PosterGridEntry & { fav: FavoriteItem }>((fav) => ({
        key: fav.key,
        title: fav.name,
        image: fav.icon,
        favorite: true,
        fav,
      })),
    [favorites],
  );

  const empty = !lastChannel && continueEntries.length === 0 && favoriteEntries.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.overview}>
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>Olá{userInfo?.username ? `, ${userInfo.username}` : ''}!</Text>
        {userInfo ? <Text style={styles.welcomeText}>Assinatura válida até: {formatExpiry(userInfo.exp_date)}</Text> : null}
      </View>

      {lastChannel ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Último canal assistido</Text>
          <AppButton
            label={lastChannel.name}
            icon="▶"
            variant="secondary"
            style={styles.lastChannel}
            onPress={() => navigation.navigate('Player', { item: lastChannel, zapSource: 'category' })}
          />
        </View>
      ) : null}

      <ContentRow title="Continuar assistindo" items={continueEntries} onPress={(e) => resume(e.entry)} />
      <ContentRow title="Favoritos" items={favoriteEntries} onPress={(e) => openFavorite(e.fav)} />

      {empty ? (
        <View style={styles.shortcuts}>
          <Text style={styles.welcomeText}>Escolha por onde começar:</Text>
          <View style={styles.shortcutRow}>
            <AppButton label="Canais ao vivo" onPress={() => onNavigate('live')} />
            <AppButton label="Filmes" variant="secondary" onPress={() => onNavigate('movie')} />
            <AppButton label="Séries" variant="secondary" onPress={() => onNavigate('series')} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  overview: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  welcome: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
  },
  welcomeText: {
    color: colors.textMuted,
    fontSize: font.body,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.medium,
    fontWeight: '700',
  },
  lastChannel: {
    alignSelf: 'flex-start',
  },
  shortcuts: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
