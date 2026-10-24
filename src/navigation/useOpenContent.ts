import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { FavoriteInput, FavoriteItem } from '../store/favorites';
import { useToggleFavorite } from '../store/favorites';
import type { ProgressEntry } from '../store/progress';
import { notify } from '../utils/notify';
import type { RootStackParamList } from './types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function useOpenContent() {
  const navigation = useNavigation<Nav>();
  const toggleFavorite = useToggleFavorite();

  const openFavorite = useCallback(
    (fav: FavoriteItem) => {
      if (fav.type === 'live') {
        navigation.navigate('Player', {
          item: { kind: 'live', id: fav.id, name: fav.name, icon: fav.icon, categoryId: fav.categoryId },
          zapSource: 'favorites',
        });
      } else if (fav.type === 'movie') {
        navigation.navigate('MovieDetail', {
          streamId: fav.id,
          name: fav.name,
          icon: fav.icon,
          extension: fav.extension,
          categoryId: fav.categoryId,
        });
      } else {
        navigation.navigate('SeriesDetail', {
          seriesId: fav.id,
          name: fav.name,
          cover: fav.icon,
          categoryId: fav.categoryId,
        });
      }
    },
    [navigation],
  );

  const resume = useCallback(
    (entry: ProgressEntry) => {
      const { key: _key, position, duration: _duration, updatedAt: _updatedAt, finished: _finished, ...item } = entry;
      navigation.navigate('Player', { item, startAt: position });
    },
    [navigation],
  );

  /** Alterna o favorito e avisa o usuário (usado na pressão longa das listas). */
  const toggleWithFeedback = useCallback(
    (item: FavoriteInput) => {
      const added = toggleFavorite(item);
      notify(added ? `"${item.name}" adicionado aos favoritos` : `"${item.name}" removido dos favoritos`);
    },
    [toggleFavorite],
  );

  return { navigation, openFavorite, resume, toggleWithFeedback };
}
